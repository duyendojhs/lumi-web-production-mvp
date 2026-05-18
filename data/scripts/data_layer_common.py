from __future__ import annotations

import csv
import hashlib
import html
import json
import math
import re
import statistics
import unicodedata
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

DATA_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = DATA_DIR.parent
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
FEATURES_DIR = DATA_DIR / "features"
METADATA_DIR = DATA_DIR / "metadata"
REPORTS_DIR = DATA_DIR / "reports"

TEXT_EXTENSIONS = {".txt", ".md"}
HTML_EXTENSIONS = {".html", ".htm"}
TABLE_EXTENSIONS = {".csv", ".json", ".xlsx"}
CONTENT_FILE_TYPES = {"pdf", "html", "txt"}
TABLE_FILE_TYPES = {"json", "csv", "xlsx"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_data_dirs() -> None:
    for path in [
        PROCESSED_DIR / "documents",
        PROCESSED_DIR / "tables",
        PROCESSED_DIR / "text",
        FEATURES_DIR / "chunks",
        FEATURES_DIR / "statistics",
        FEATURES_DIR / "search_index",
        METADATA_DIR,
        REPORTS_DIR,
    ]:
        path.mkdir(parents=True, exist_ok=True)


def rel_path(path: Path, base: Path = RAW_DIR) -> str:
    return path.relative_to(base).as_posix()


def classify_file_type(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".pdf":
        return "pdf"
    if ext in HTML_EXTENSIONS:
        return "html"
    if ext == ".txt":
        return "txt"
    if ext == ".md":
        return "md"
    if ext == ".json":
        return "json"
    if ext == ".csv":
        return "csv"
    if ext == ".xlsx":
        return "xlsx"
    if ext == ".zip":
        return "archive"
    return "other"


def infer_category(relative_path: str, fallback: str = "khac") -> str:
    text = normalize_ascii(relative_path).lower()
    rules = [
        ("tuyen_sinh", ["tuyen-sinh", "tuyen_sinh", "admission", "xet-tuyen", "nhap-hoc"]),
        ("dao_tao", ["dao-tao", "dao_tao", "training", "chuong-trinh", "ths-", "ts-"]),
        ("quy_che", ["quy-che", "quy_dinh", "quy-dinh", "policy", "regulation"]),
        ("thong_bao", ["thong-bao", "notice", "announcement"]),
        ("nghien_cuu", ["nghien-cuu", "nghien_cuu", "research", "ptn", "lab"]),
        ("sinh_vien", ["sinh-vien", "sinh_vien", "student", "hoc-sinh", "ktx"]),
    ]
    for category, needles in rules:
        if any(needle in text for needle in needles):
            return category
    return fallback or "khac"


def classify_data_role(relative_path: str, file_type: str) -> str:
    path_text = relative_path.replace("\\", "/").lower()
    name = Path(path_text).name
    if file_type == "archive":
        return "archive"
    if file_type == "md" or name.startswith("readme"):
        return "system"
    if file_type in TABLE_FILE_TYPES and (
        "manifest" in name
        or path_text.startswith("source_lists/")
        or path_text.startswith("json/")
        or path_text.startswith("csv/")
        or path_text.startswith("excel/")
    ):
        return "manifest"
    if file_type in CONTENT_FILE_TYPES:
        return "content"
    if file_type in TABLE_FILE_TYPES:
        return "table"
    return "other"


def is_processable_role(data_role: str, file_type: str) -> bool:
    return data_role in {"content", "table", "manifest"} and file_type in CONTENT_FILE_TYPES.union(TABLE_FILE_TYPES)


def clean_title_from_filename(file_name: str) -> str:
    stem = Path(file_name).stem
    cleaned = re.sub(r"[_\-]+", " ", stem)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .")
    if not cleaned:
        return Path(file_name).stem
    words = []
    for word in cleaned.split(" "):
        if word.isupper() or word.isdigit() or re.fullmatch(r"\d+\.?", word):
            words.append(word)
        elif len(word) <= 3 and normalize_ascii(word).lower() in {"qd", "ts", "ths", "pdf", "vnu", "hus"}:
            words.append(word.upper())
        else:
            words.append(word[:1].upper() + word[1:])
    return " ".join(words)


def is_generic_title(title: str) -> bool:
    value = normalize_ascii(title or "").lower()
    value = re.sub(r"\s+", " ", value).strip()
    generic_needles = [
        "xem noi dung pdf",
        "noi dung pdf",
        "pdf document",
        "untitled",
        "khong co tieu de",
    ]
    return not value or value in {"pdf", "document"} or any(needle in value for needle in generic_needles)


def choose_display_title(title: str, file_name: str) -> str:
    if is_generic_title(title):
        return clean_title_from_filename(file_name)
    return normalize_text(title)


def normalize_ascii(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_document_id(relative_path: str, checksum: str) -> str:
    token = hashlib.sha256(f"{relative_path}|{checksum}".encode("utf-8")).hexdigest()[:16]
    return f"doc_{token}"


def read_text_file(path: Path, max_chars: int | None = None) -> tuple[str, str, list[str]]:
    raw = path.read_bytes()
    issues: list[str] = []
    for encoding in ("utf-8-sig", "utf-8", "utf-16", "cp1258", "latin-1"):
        try:
            text = raw.decode(encoding)
            if "\ufffd" in text:
                issues.append("replacement_character_detected")
            if looks_like_mojibake(text):
                issues.append("possible_mojibake")
            if max_chars:
                text = text[:max_chars]
            return text, encoding, issues
        except UnicodeDecodeError:
            continue
    text = raw.decode("utf-8", errors="replace")
    issues.append("encoding_fallback_replace")
    if looks_like_mojibake(text):
        issues.append("possible_mojibake")
    return (text[:max_chars] if max_chars else text), "utf-8-replace", issues


def looks_like_mojibake(text: str) -> bool:
    if not text:
        return False
    markers = ("Ã", "Ä", "áº", "á»", "Â", "Æ°", "Æ¡")
    score = sum(text.count(marker) for marker in markers)
    return score >= 3


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_html_text(path: Path) -> dict[str, Any]:
    text, encoding, issues = read_text_file(path)
    title = ""
    body = ""
    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(text, "html.parser")
        for tag in soup(["script", "style", "noscript", "svg", "nav", "footer"]):
            tag.decompose()
        if soup.title and soup.title.string:
            title = normalize_text(soup.title.string)
        main = soup.find("main") or soup.body or soup
        body = normalize_text(main.get_text("\n"))
    except Exception as exc:
        issues.append(f"html_parse_fallback:{type(exc).__name__}")
        title_match = re.search(r"<title[^>]*>(.*?)</title>", text, flags=re.I | re.S)
        title = normalize_text(re.sub(r"<[^>]+>", " ", title_match.group(1))) if title_match else ""
        stripped = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text, flags=re.I | re.S)
        body = normalize_text(re.sub(r"<[^>]+>", " ", stripped))
    return {"title": title, "text": body, "encoding": encoding, "issues": issues}


def extract_pdf_text(path: Path, max_pages: int | None = 30, max_chars: int = 250_000) -> dict[str, Any]:
    issues: list[str] = []
    metadata: dict[str, Any] = {}
    page_count = 0
    texts: list[str] = []
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        page_count = len(reader.pages)
        raw_meta = reader.metadata or {}
        metadata = {str(k).strip("/"): str(v) for k, v in raw_meta.items() if v is not None}
        page_limit = min(page_count, max_pages) if max_pages else page_count
        for index in range(page_limit):
            try:
                page_text = reader.pages[index].extract_text() or ""
                if page_text:
                    texts.append(page_text)
                if sum(len(item) for item in texts) >= max_chars:
                    issues.append("pdf_text_truncated")
                    break
            except Exception as exc:
                issues.append(f"pdf_page_{index}_extract_error:{type(exc).__name__}")
    except Exception as exc:
        issues.append(f"pdf_extract_error:{type(exc).__name__}")
    text = normalize_text("\n\n".join(texts))
    return {
        "text": text[:max_chars],
        "text_length": len(text),
        "page_count": page_count,
        "metadata": metadata,
        "needs_ocr": len(text) < 200,
        "issues": issues,
    }


def read_json_rows(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    issues: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        return [], [f"json_parse_error:{type(exc).__name__}"]
    if isinstance(data, list):
        rows = [row if isinstance(row, dict) else {"value": row} for row in data]
    elif isinstance(data, dict):
        rows = data.get("records") if isinstance(data.get("records"), list) else [data]
        rows = [row if isinstance(row, dict) else {"value": row} for row in rows]
    else:
        rows = [{"value": data}]
    return rows, issues


def read_csv_rows(path: Path, max_rows: int | None = None) -> tuple[list[dict[str, Any]], list[str]]:
    issues: list[str] = []
    rows: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for index, row in enumerate(reader):
                if max_rows and index >= max_rows:
                    break
                rows.append(dict(row))
    except Exception as exc:
        issues.append(f"csv_parse_error:{type(exc).__name__}")
    return rows, issues


def read_xlsx_rows(path: Path, max_rows: int | None = None) -> tuple[list[dict[str, Any]], list[str]]:
    issues: list[str] = []
    try:
        with zipfile.ZipFile(path) as archive:
            shared = _xlsx_shared_strings(archive)
            sheet_name = "xl/worksheets/sheet1.xml"
            root = ET.fromstring(archive.read(sheet_name))
            ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            parsed_rows: list[list[str]] = []
            for row in root.findall(".//a:sheetData/a:row", ns):
                values: list[str] = []
                for cell in row.findall("a:c", ns):
                    values.append(_xlsx_cell_value(cell, shared, ns))
                parsed_rows.append(values)
                if max_rows and len(parsed_rows) >= max_rows + 1:
                    break
            if not parsed_rows:
                return [], ["xlsx_empty_sheet"]
            headers = [header or f"column_{idx+1}" for idx, header in enumerate(parsed_rows[0])]
            rows = [dict(zip(headers, values + [""] * (len(headers) - len(values)))) for values in parsed_rows[1:]]
            return rows, issues
    except Exception as exc:
        return [], [f"xlsx_parse_error:{type(exc).__name__}"]


def _xlsx_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    values: list[str] = []
    for item in root.findall("a:si", ns):
        parts = [node.text or "" for node in item.findall(".//a:t", ns)]
        values.append("".join(parts))
    return values


def _xlsx_cell_value(cell: ET.Element, shared: list[str], ns: dict[str, str]) -> str:
    value_node = cell.find("a:v", ns)
    inline_node = cell.find(".//a:t", ns)
    if inline_node is not None:
        return inline_node.text or ""
    if value_node is None or value_node.text is None:
        return ""
    value = value_node.text
    if cell.attrib.get("t") == "s":
        try:
            return shared[int(value)]
        except Exception:
            return value
    return value


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        keys: list[str] = []
        for row in rows:
            for key in row:
                if key not in keys:
                    keys.append(key)
        fieldnames = keys
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_xlsx(path: Path, rows: list[dict[str, Any]], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        fieldnames = []
        for row in rows:
            for key in row:
                if key not in fieldnames:
                    fieldnames.append(key)
    sheet_rows = [fieldnames] + [[_cell_string(row.get(field, "")) for field in fieldnames] for row in rows]
    shared_strings: list[str] = []
    shared_index: dict[str, int] = {}

    def sst(value: str) -> int:
        if value not in shared_index:
            shared_index[value] = len(shared_strings)
            shared_strings.append(value)
        return shared_index[value]

    sheet_xml_rows = []
    for row_idx, values in enumerate(sheet_rows, start=1):
        cells = []
        for col_idx, value in enumerate(values, start=1):
            ref = f"{_xlsx_col(col_idx)}{row_idx}"
            cells.append(f'<c r="{ref}" t="s"><v>{sst(value)}</v></c>')
        sheet_xml_rows.append(f'<row r="{row_idx}">{"".join(cells)}</row>')
    sheet_xml = f'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>{"".join(sheet_xml_rows)}</sheetData></worksheet>'
    shared_xml = '<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{0}" uniqueCount="{0}">{1}</sst>'.format(
        len(shared_strings), "".join(f"<si><t>{_xml_escape(value)}</t></si>" for value in shared_strings)
    )
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", _xlsx_content_types())
        archive.writestr("_rels/.rels", _xlsx_root_rels())
        archive.writestr("xl/workbook.xml", _xlsx_workbook())
        archive.writestr("xl/_rels/workbook.xml.rels", _xlsx_workbook_rels())
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)
        archive.writestr("xl/sharedStrings.xml", shared_xml)
        archive.writestr("xl/styles.xml", _xlsx_styles())


def _cell_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def _xlsx_col(index: int) -> str:
    letters = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def _xml_escape(value: str) -> str:
    return html.escape(value, quote=False)


def _xlsx_content_types() -> str:
    return """<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>"""


def _xlsx_root_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>"""


def _xlsx_workbook() -> str:
    return """<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="data_catalog" sheetId="1" r:id="rId1"/></sheets></workbook>"""


def _xlsx_workbook_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>"""


def _xlsx_styles() -> str:
    return """<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>"""


def load_source_manifest() -> dict[str, dict[str, Any]]:
    candidates = [
        RAW_DIR / "json" / "data_raw_manifest.json",
        RAW_DIR / "source_lists" / "collected_sources.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                rows = json.loads(candidate.read_text(encoding="utf-8-sig"))
                if isinstance(rows, list):
                    return {str(row.get("relative_path", "")).replace("\\", "/"): row for row in rows if isinstance(row, dict)}
            except Exception:
                continue
    return {}


def table_profile(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        return {"row_count": 0, "column_count": 0, "columns": [], "duplicate_rows": 0, "outliers": {}}
    columns = list({key for row in rows for key in row.keys()})
    column_profiles = []
    numeric_values: dict[str, list[float]] = {column: [] for column in columns}
    for column in columns:
        values = [row.get(column) for row in rows]
        missing = sum(1 for value in values if value is None or str(value).strip() == "")
        for value in values:
            try:
                if value is not None and str(value).strip() != "":
                    numeric_values[column].append(float(str(value).replace(",", "")))
            except ValueError:
                pass
        inferred_type = "number" if len(numeric_values[column]) >= max(3, len(rows) // 2) else "string"
        column_profiles.append(
            {
                "name": column,
                "missing_count": missing,
                "missing_percent": round(missing / len(rows) * 100, 2),
                "inferred_type": inferred_type,
            }
        )
    row_keys = [json.dumps(row, ensure_ascii=False, sort_keys=True) for row in rows]
    duplicate_rows = len(row_keys) - len(set(row_keys))
    outliers: dict[str, int] = {}
    for column, values in numeric_values.items():
        if len(values) < 4:
            continue
        sorted_values = sorted(values)
        q1 = _quantile(sorted_values, 0.25)
        q3 = _quantile(sorted_values, 0.75)
        iqr = q3 - q1
        if iqr <= 0:
            continue
        low = q1 - 1.5 * iqr
        high = q3 + 1.5 * iqr
        count = sum(1 for value in values if value < low or value > high)
        if count:
            outliers[column] = count
    return {
        "row_count": len(rows),
        "column_count": len(columns),
        "columns": column_profiles,
        "duplicate_rows": duplicate_rows,
        "outliers": outliers,
    }


def _quantile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    index = (len(values) - 1) * q
    lower = math.floor(index)
    upper = math.ceil(index)
    if lower == upper:
        return values[int(index)]
    return values[lower] * (upper - index) + values[upper] * (index - lower)


def summarize_text_lengths(lengths: list[int]) -> dict[str, Any]:
    if not lengths:
        return {"min": 0, "max": 0, "avg": 0, "median": 0, "buckets": {}}
    buckets = Counter()
    for length in lengths:
        if length < 500:
            buckets["0-500"] += 1
        elif length < 2_000:
            buckets["500-2k"] += 1
        elif length < 10_000:
            buckets["2k-10k"] += 1
        elif length < 50_000:
            buckets["10k-50k"] += 1
        else:
            buckets["50k+"] += 1
    return {
        "min": min(lengths),
        "max": max(lengths),
        "avg": round(statistics.mean(lengths), 2),
        "median": round(statistics.median(lengths), 2),
        "buckets": dict(buckets),
    }


def keywords_from_text(text: str, limit: int = 12) -> list[str]:
    stopwords = {
        "and",
        "the",
        "for",
        "with",
        "trong",
        "cua",
        "cac",
        "cho",
        "duoc",
        "nhung",
        "from",
        "this",
        "that",
        "lumi",
    }
    words = re.findall(r"[a-z0-9_]{4,}", normalize_ascii(text).lower())
    counts = Counter(word for word in words if word not in stopwords and not word.isdigit())
    return [word for word, _ in counts.most_common(limit)]


def issue_counter(records: list[dict[str, Any]]) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for record in records:
        for issue in record.get("issues", []) or []:
            counts[str(issue).split(":")[0]] += 1
    return dict(counts)
