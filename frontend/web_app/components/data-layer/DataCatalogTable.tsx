"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import type { DataCatalogRecord, DataChunkRecord } from "@/lib/server/dataLayerOutputs";
import { Panel, StatusBadge } from "@/components/dashboard/Primitives";

const pageSize = 15;
const quickFilters = ["all", "needs_ocr", "has_issue", "healthy", "html", "pdf", "txt", "public_hus", "local_source", "large_file"];
const quickFilterLabels: Record<string, string> = {
  all: "tất cả",
  needs_ocr: "cần OCR",
  has_issue: "có issue",
  healthy: "ổn định",
  html: "HTML",
  pdf: "PDF",
  txt: "TXT",
  public_hus: "nguồn HUS",
  local_source: "nguồn local",
  large_file: "file lớn",
};

export function DataCatalogTable({ catalog, chunks }: Readonly<{ catalog: DataCatalogRecord[]; chunks: DataChunkRecord[] }>) {
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState("all");
  const [sort, setSort] = useState("issueCount");
  const [includeSystem, setIncludeSystem] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<DataCatalogRecord | null>(null);
  const chunkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    chunks.forEach((chunk) => counts.set(chunk.document_id, (counts.get(chunk.document_id) ?? 0) + 1));
    return counts;
  }, [chunks]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = catalog.filter((row) => {
      if (!includeSystem && !row.is_content_document) return false;
      if (q && !`${row.title} ${row.relative_path} ${row.source_domain ?? ""}`.toLowerCase().includes(q)) return false;
      if (quick === "needs_ocr" && !(row.issues ?? []).includes("pdf_sample_needs_ocr")) return false;
      if (quick === "has_issue" && !(row.issues ?? []).length) return false;
      if (quick === "healthy" && ((row.issues ?? []).length || row.ingestion_status !== "ok")) return false;
      if (quick === "html" && row.file_type !== "html") return false;
      if (quick === "pdf" && row.file_type !== "pdf") return false;
      if (quick === "txt" && row.file_type !== "txt") return false;
      if (quick === "local_source" && row.source_domain && row.source_domain !== "local") return false;
      if (quick === "public_hus" && !(row.source_domain ?? "").includes("hus")) return false;
      if (quick === "large_file" && !((row.issues ?? []).includes("large_file") || (row.file_size_bytes ?? 0) > 10 * 1024 * 1024)) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "size") return (b.file_size_bytes ?? 0) - (a.file_size_bytes ?? 0);
      if (sort === "status") return String(a.ingestion_status).localeCompare(String(b.ingestion_status));
      if (sort === "type") return a.file_type.localeCompare(b.file_type);
      if (sort === "category") return a.category.localeCompare(b.category);
      return (b.issues?.length ?? 0) - (a.issues?.length ?? 0);
    });
  }, [catalog, includeSystem, query, quick, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="grid gap-3 xl:grid-cols-[1.45fr_0.75fr]">
      <Panel title="Catalog dữ liệu" subtitle={`${rows.length} bản ghi, ${pageSize} dòng/trang; file hệ thống ${includeSystem ? "đang hiện" : "đang ẩn"}`}>
        <div className="mb-3 grid gap-2 xl:grid-cols-[1fr_180px_160px_150px]">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-mist px-3 py-2 text-xs">
            <Search className="h-4 w-4 text-slate-500" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Tìm trong catalog" className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <select value={quick} onChange={(event) => { setQuick(event.target.value); setPage(0); }} className="rounded-lg border border-line bg-mist px-3 py-2 text-xs font-semibold text-ink outline-none">
            {quickFilters.map((item) => <option key={item} value={item}>{quickFilterLabels[item]}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-line bg-mist px-3 py-2 text-xs font-semibold text-ink outline-none">
            <option value="issueCount">sắp xếp: số issue</option>
            <option value="size">sắp xếp: dung lượng</option>
            <option value="status">sắp xếp: trạng thái</option>
            <option value="type">sắp xếp: loại file</option>
            <option value="category">sắp xếp: nhóm</option>
          </select>
          <label className="flex items-center justify-between gap-2 rounded-lg border border-line bg-mist px-3 py-2 text-xs font-semibold text-ink">
            <span>hiện hệ thống</span>
            <input type="checkbox" checked={includeSystem} onChange={(event) => { setIncludeSystem(event.target.checked); setPage(0); }} />
          </label>
        </div>
        <div className="max-h-[430px] overflow-auto">
          <table className="w-full min-w-[1260px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-white text-slate-500">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Tài sản</th>
                <th className="py-2 pr-3">Loại</th>
                <th className="py-2 pr-3">Nhóm</th>
                <th className="py-2 pr-3">Phụ trách</th>
                <th className="py-2 pr-3">Tags</th>
                <th className="py-2 pr-3">SLA/Freshness</th>
                <th className="py-2 pr-3">Dung lượng</th>
                <th className="py-2 pr-3">Chunks</th>
                <th className="py-2 pr-3">Nguồn</th>
                <th className="py-2 pr-3">Chất lượng</th>
                <th className="py-2 pr-3">Issues</th>
                <th className="py-2 pr-3">Xem</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.document_id} className="border-b border-line hover:bg-mist">
                  <td className="max-w-[300px] truncate py-2 pr-3 font-semibold text-ink" title={row.title}>{row.title}</td>
                  <td className="py-2 pr-3">{row.file_type}</td>
                  <td className="py-2 pr-3">{row.category}</td>
                  <td className="max-w-[130px] truncate py-2 pr-3" title={ownerFor(row)}>{ownerFor(row)}</td>
                  <td className="max-w-[190px] py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {tagsFor(row).slice(0, 3).map((tag) => <span key={tag} className="rounded-md bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{tagLabel(tag)}</span>)}
                    </div>
                  </td>
                  <td className="py-2 pr-3">{freshnessFor(row)}</td>
                  <td className="py-2 pr-3">{formatBytes(row.file_size_bytes ?? 0)}</td>
                  <td className="py-2 pr-3">{chunkCounts.get(row.document_id) ?? 0}</td>
                  <td className="max-w-[150px] truncate py-2 pr-3" title={row.source_domain || "local"}>{row.source_domain || "local"}</td>
                  <td className="py-2 pr-3"><StatusBadge status={qualityTone(row)} /></td>
                  <td className="max-w-[220px] truncate py-2 pr-3 text-slate-600" title={(row.issues ?? []).map(issueLabel).join(", ") || "không có"}>{(row.issues ?? []).slice(0, 2).map(issueLabel).join(", ") || "không có"}</td>
                  <td className="py-2 pr-3"><button onClick={() => setSelected(row)} className="rounded-md border border-line bg-white p-1.5 hover:bg-mist" aria-label="Xem chi tiết dòng"><Eye className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-slate-600">Trang {safePage + 1} / {pageCount}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border border-line bg-white px-3 py-2 font-semibold hover:bg-mist"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <button onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} className="rounded-lg border border-line bg-white px-3 py-2 font-semibold hover:bg-mist"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </Panel>

      <Panel title="Xem trước tài liệu" subtitle="Dòng catalog đang chọn">
        {selected ? <Detail row={selected} chunkCount={chunkCounts.get(selected.document_id) ?? 0} /> : <p className="text-sm text-slate-600">Chọn một dòng để xem tiêu đề, nguồn, checksum, issue và tác động lineage.</p>}
      </Panel>
    </div>
  );
}

function Detail({ row, chunkCount }: Readonly<{ row: DataCatalogRecord; chunkCount: number }>) {
  return (
    <div className="max-h-[720px] overflow-auto pr-1 grid gap-2 text-sm">
      <p className="font-semibold leading-5 text-ink" title={row.title}>{row.title}</p>
      <div className="grid grid-cols-2 gap-2">
        <Mini label="Loại" value={row.file_type} />
        <Mini label="Nhóm" value={row.category} />
        <Mini label="Phụ trách" value={ownerFor(row)} />
        <Mini label="Dung lượng" value={formatBytes(row.file_size_bytes ?? 0)} />
        <Mini label="Chunks" value={String(chunkCount)} />
        <Mini label="SLA" value={freshnessFor(row)} />
      </div>
      <div className="flex flex-wrap gap-1">
        {tagsFor(row).map((tag) => <span key={tag} className="rounded-md border border-line bg-mist px-2 py-1 text-[11px] font-semibold text-slate-600">{tagLabel(tag)}</span>)}
      </div>
      <Block label="Trạng thái xử lý" value={processingStatus(row, chunkCount)} />
      <Block label="Data product liên quan" value={productFor(row)} />
      <Block label="Hành động đề xuất" value={suggestedAction(row)} />
      <Block label="Đường dẫn raw" value={row.relative_path} />
      <Block label="Đường dẫn local" value={row.local_path || row.relative_path} />
      <Block label="Nguồn" value={row.source_url || row.source_domain || "local"} />
      <Block label="Checksum SHA-256" value={row.checksum_sha256 || "không có"} />
      <Block label="Issues" value={(row.issues ?? []).map(issueLabel).join(", ") || "không có"} />
    </div>
  );
}

function Mini({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="rounded-lg border border-line bg-mist p-2"><p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 break-words font-semibold leading-5 text-ink" title={value}>{value}</p></div>;
}

function Block({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="rounded-lg border border-line bg-mist p-2 text-xs"><p className="font-semibold text-slate-700">{label}</p><p className="mt-1 break-all text-slate-600">{value}</p></div>;
}

function qualityTone(row: DataCatalogRecord) {
  if ((row.issues ?? []).includes("pdf_sample_needs_ocr")) return "warning";
  if ((row.issues ?? []).length || row.ingestion_status === "warning") return "review";
  if (row.ingestion_status === "error") return "critical";
  return "healthy";
}

function processingStatus(row: DataCatalogRecord, chunkCount: number) {
  if ((row.issues ?? []).includes("pdf_sample_needs_ocr")) return "cần OCR trước khi phủ AI/RAG đầy đủ";
  if (!row.is_content_document) return "file hệ thống/manifest, mặc định không tính vào KPI nội dung";
  if (chunkCount > 0) return "đã xử lý thành feature chunk";
  if (row.ingestion_status === "ok") return "đã ingest; chưa sinh chunk";
  return statusLabel(row.ingestion_status || "unknown");
}

function ownerFor(row: DataCatalogRecord) {
  if (row.category === "tuyen_sinh") return "Nhóm tuyển sinh";
  if (row.category === "nghien_cuu") return "Văn phòng nghiên cứu";
  if (row.category === "sinh_vien") return "Công tác sinh viên";
  if (row.category === "quy_che") return "Phòng đào tạo";
  if (row.category === "dao_tao") return "Nhóm chương trình đào tạo";
  return row.is_content_document ? "Nội dung học thuật" : "Nhóm dữ liệu";
}

function tagsFor(row: DataCatalogRecord) {
  const tags = [row.category, row.file_type === "pdf" ? "pdf_doc" : `${row.file_type}_asset`];
  if ((row.issues ?? []).includes("pdf_sample_needs_ocr")) tags.push("pdf_scan");
  if ((row.source_domain ?? "").includes("hus")) tags.push("hus_public");
  if (!row.source_url) tags.push("local");
  if ((row.issues ?? []).length) tags.push("needs_review");
  return Array.from(new Set(tags.filter(Boolean)));
}

function freshnessFor(row: DataCatalogRecord) {
  if ((row.issues ?? []).includes("pdf_sample_needs_ocr")) return "needs_review";
  if ((row.source_domain ?? "").includes("hus")) return "public_source";
  if (row.is_content_document) return "local_static";
  return "support_file";
}

function productFor(row: DataCatalogRecord) {
  if (row.category === "tuyen_sinh") return "Tri thức tuyển sinh HUS";
  if (row.category === "dao_tao") return "Chương trình đào tạo HUS";
  if (row.category === "nghien_cuu") return "Phòng thí nghiệm và cơ sở nghiên cứu";
  if (row.category === "sinh_vien") return "Tài liệu hướng dẫn sinh viên";
  if (row.category === "quy_che") return "Quy chế và quy định";
  return "Tri thức HUS tổng hợp";
}

function suggestedAction(row: DataCatalogRecord) {
  if ((row.issues ?? []).includes("pdf_sample_needs_ocr")) return "Đưa vào hàng đợi OCR trước khi dùng cho AI/RAG đầy đủ.";
  if ((row.issues ?? []).includes("possible_mojibake")) return "Rà encoding tiếng Việt và decode/fetch lại nếu cần.";
  if ((row.issues ?? []).includes("html_short_body")) return "Kiểm tra đây là trang nội dung hay chỉ là trang điều hướng.";
  if (!row.is_content_document) return "Giữ làm metadata hỗ trợ, mặc định ẩn khỏi KPI nội dung.";
  return "Sẵn sàng cho catalog/search demo.";
}

function issueLabel(issue: string) {
  return issue
    .replace("pdf_sample_needs_ocr", "PDF cần OCR")
    .replace("possible_mojibake", "nghi mojibake")
    .replace("html_short_body", "HTML mỏng")
    .replace("large_file", "file lớn")
    .replace("md_not_processed_by_default", "MD không xử lý mặc định")
    .replace("archive_not_processed_by_default", "archive không xử lý mặc định");
}

function tagLabel(tag: string) {
  return tag
    .replace("pdf_doc", "PDF")
    .replace("html_asset", "HTML")
    .replace("txt_asset", "TXT")
    .replace("pdf_scan", "PDF scan")
    .replace("hus_public", "nguồn HUS")
    .replace("needs_review", "cần rà soát");
}

function statusLabel(status: string) {
  return status
    .replace("warning", "cảnh báo")
    .replace("error", "lỗi")
    .replace("unknown", "chưa rõ")
    .replace("ok", "ổn định");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
