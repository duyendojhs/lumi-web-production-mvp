from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

from data_layer_common import FEATURES_DIR, normalize_ascii


RAG_DIR = FEATURES_DIR / "rag_index"


def search(query: str, limit: int = 5) -> list[dict[str, Any]]:
    rows = _read_jsonl(RAG_DIR / "chunks_for_rag.jsonl")
    terms = [term for term in normalize_ascii(query).lower().split() if len(term) >= 3]
    scored = []
    for row in rows:
        haystack = normalize_ascii(" ".join([str(row.get("title") or ""), str(row.get("category") or ""), str(row.get("text") or "")])).lower()
        keyword_hits = len(set(terms).intersection(set(row.get("keywords") or [])))
        text_hits = sum(haystack.count(term) for term in terms)
        score = keyword_hits * 3 + text_hits
        if score:
            scored.append({**row, "score": score})
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:limit]


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    parser = argparse.ArgumentParser(description="Search local RAG keyword index.")
    parser.add_argument("query")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    results = search(args.query, args.limit)
    print(json.dumps({"query": args.query, "total": len(results), "results": [{"score": row["score"], "title": row.get("title"), "category": row.get("category"), "preview": row.get("text_preview")} for row in results]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
