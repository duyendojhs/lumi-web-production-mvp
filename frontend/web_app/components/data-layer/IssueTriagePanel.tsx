"use client";

import { AlertTriangle, ClipboardCheck, Download, Eye, PlayCircle } from "lucide-react";
import type { IssueTriageItem, IssueTriageReport, ProductionReadiness } from "@/lib/server/dataLayerOutputs";
import { ActionButton, Panel, StatusBadge } from "@/components/dashboard/Primitives";

const columns = [
  { key: "critical", title: "Khẩn cấp", tone: "critical" },
  { key: "warning", title: "Cần xem", tone: "warning" },
  { key: "info", title: "Thông tin", tone: "planned" },
];

export function IssueTriagePanel({ issueTriage, productionReadiness }: Readonly<{ issueTriage: IssueTriageReport; productionReadiness: ProductionReadiness }>) {
  const issues = issueTriage.issues ?? [];
  const ocr = productionReadiness.ocrBatch;
  const history = productionReadiness.runHistory.slice(-6).reverse();
  return (
    <div className="grid gap-3">
      <section className="grid gap-3 xl:grid-cols-[0.55fr_0.45fr]">
        <Panel title="Trạng thái OCR batch" subtitle="Quy trình OCR cho PDF đã được gắn cờ">
          <div className="grid gap-3 md:grid-cols-4">
            <Mini label="Đã xử lý" value={String(ocr.processed_items ?? 0)} status={Object.keys(ocr).length ? "ready" : "planned"} />
            <Mini label="Hoàn tất" value={String(ocr.completed ?? 0)} status="healthy" />
            <Mini label="Thất bại" value={String(ocr.failed ?? 0)} status={Number(ocr.failed ?? 0) ? "critical" : "healthy"} />
            <Mini label="Không khả dụng" value={String(ocr.unavailable ?? 0)} status={Number(ocr.unavailable ?? 0) ? "warning" : "healthy"} />
          </div>
          <p className="mt-3 break-all rounded-lg bg-mist px-3 py-2 font-mono text-xs text-slate-700">Chạy OCR bằng worker riêng rồi ghi kết quả vào Storage/Postgres</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Nếu thiếu Tesseract hoặc pdftoppm, script ghi report không khả dụng rõ ràng thay vì crash.</p>
        </Panel>
        <Panel title="Lịch sử chạy" subtitle="Lịch sử pipeline thật từ pipeline_run_history.jsonl">
          <div className="max-h-[210px] overflow-auto">
            <div className="grid gap-2">
              {history.length ? history.map((run) => (
                <div key={String(run.run_id)} className="grid grid-cols-[1fr_70px_70px] items-center gap-2 rounded-lg border border-line bg-mist p-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{String(run.run_id)}</p>
                    <p className="text-slate-500">{String(run.finished_at ?? "")}</p>
                  </div>
                  <span className="font-bold text-teal">{String(run.overall_health ?? 0)}%</span>
                  <StatusBadge status={String(run.status) === "success" ? "ready" : "critical"} />
                </div>
              )) : <p className="rounded-lg bg-mist p-3 text-sm text-slate-500">Chạy pipeline một lần để tạo lịch sử.</p>}
            </div>
          </div>
        </Panel>
      </section>
      <Panel title="Bảng triage issue" subtitle="Nhóm theo mức độ, tác động và lệnh xử lý">
        <div className="mb-3 flex flex-wrap gap-2">
          <ActionButton><span className="inline-flex items-center gap-2"><Eye className="h-3.5 w-3.5" /> Mở hàng đợi OCR</span></ActionButton>
          <ActionButton><span className="inline-flex items-center gap-2"><Download className="h-3.5 w-3.5" /> Xuất report issue</span></ActionButton>
          <ActionButton><span className="inline-flex items-center gap-2"><ClipboardCheck className="h-3.5 w-3.5" /> Đánh dấu đã rà soát</span></ActionButton>
          <ActionButton><span className="inline-flex items-center gap-2"><PlayCircle className="h-3.5 w-3.5" /> Chạy validation</span></ActionButton>
        </div>
        <div className="grid gap-3 xl:grid-cols-3">
          {columns.map((column) => {
            const rows = issues.filter((item) => item.severity === column.key);
            return (
              <section key={column.key} className="rounded-lg border border-line bg-mist p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{column.title}</h3>
                  <StatusBadge status={column.tone} />
                </div>
                <div className="grid gap-2">
                  {rows.length ? rows.map((item) => <IssueCard key={item.issue_type} item={item} />) : <p className="rounded-lg bg-white p-3 text-sm text-slate-500">Không có issue mức {column.title.toLowerCase()}.</p>}
                </div>
              </section>
            );
          })}
        </div>
      </Panel>

      <Panel title="Timeline xử lý" subtitle="Quan sát từ lần chạy local hiện tại">
        <div className="grid gap-2 md:grid-cols-5">
          {timeline(issues).map((item, index) => (
            <div key={item.title} className="relative rounded-lg border border-line bg-mist p-3">
              {index < 4 ? <div className="absolute -right-3 top-1/2 hidden h-0.5 w-6 bg-line md:block" /> : null}
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-bold text-teal">{index + 1}</span>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-2 text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Mini({ label, value, status }: Readonly<{ label: string; value: string; status: string }>) {
  return (
    <div className="rounded-lg border border-line bg-mist p-3">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
      <div className="mt-2"><StatusBadge status={status} /></div>
    </div>
  );
}

function IssueCard({ item }: Readonly<{ item: IssueTriageItem }>) {
  return (
    <article className="rounded-lg border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber" />
            <h4 className="truncate font-semibold text-ink">{labelIssue(item.issue_type)}</h4>
          </div>
          <p className="mt-1 text-sm font-semibold text-teal">{item.affected_records} bản ghi ảnh hưởng</p>
        </div>
        <StatusBadge status={item.severity === "info" ? "planned" : item.severity} />
      </div>
      <div className="mt-3 grid gap-2">
        <Info label="Nguyên nhân" value={translateIssueText(item.root_cause)} />
        <Info label="Tác động" value={translateIssueText(item.downstream_impact)} />
        <Info label="Cách xử lý" value={translateIssueText(item.suggested_fix)} />
      </div>
      <div className="mt-2 rounded-lg border border-line bg-mist px-3 py-2 text-xs font-mono text-slate-700">{item.command}</div>
    </article>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs leading-5 text-slate-700">{value}</p>
    </div>
  );
}

function timeline(issues: IssueTriageItem[]) {
  const count = (type: string) => issues.find((item) => item.issue_type === type)?.affected_records ?? 0;
  return [
    { title: "OCR backlog", note: `${count("pdf_needs_ocr")} PDF còn cần OCR trước khi phủ AI đầy đủ.`, status: count("pdf_needs_ocr") ? "critical" : "healthy" },
    { title: "Ô thiếu", note: `${count("missing_cells")} ô thiếu trong bảng/manifest hỗ trợ.`, status: count("missing_cells") ? "warning" : "healthy" },
    { title: "Ứng viên mojibake", note: `${count("possible_mojibake")} bản ghi tiếng Việt cần rà encoding.`, status: count("possible_mojibake") ? "warning" : "healthy" },
    { title: "HTML mỏng", note: `${count("html_short_body")} trang có body ngắn sau khi extract.`, status: count("html_short_body") ? "warning" : "healthy" },
    { title: "Quét trùng lặp", note: "Không có issue duplicate checksum trong report hiện tại.", status: "healthy" },
  ];
}

function labelIssue(issue: string) {
  return issue.replace("pdf_needs_ocr", "PDF cần OCR").replace("missing_cells", "Ô thiếu").replace("possible_mojibake", "Ứng viên mojibake").replace("html_short_body", "HTML mỏng");
}

function translateIssueText(value: string) {
  return value
    .replace("PDF has no usable text layer or extracted text is too short.", "PDF không có text layer dùng được hoặc text extract quá ngắn.")
    .replace("AI/RAG coverage, chunk quality, and search recall.", "Ảnh hưởng coverage AI/RAG, chất lượng chunk và recall tìm kiếm.")
    .replace("Run OCR queue for flagged PDFs.", "Chạy OCR cho các PDF đã gắn cờ.")
    .replace("Manifest/table fields are blank in raw support files.", "Một số trường manifest/bảng hỗ trợ còn trống.")
    .replace("Metadata completeness and catalog filters.", "Ảnh hưởng độ đầy đủ metadata và bộ lọc catalog.")
    .replace("Review manifest rows and fill key source/category fields.", "Rà soát manifest và bổ sung trường source/category chính.")
    .replace("Some public pages appear decoded with the wrong character set.", "Một số trang public có dấu hiệu decode sai charset.")
    .replace("Vietnamese readability and answer quality.", "Ảnh hưởng độ đọc được của tiếng Việt và chất lượng trả lời.")
    .replace("Re-fetch or re-decode affected HTML/TXT pages.", "Fetch lại hoặc decode lại HTML/TXT bị ảnh hưởng.")
    .replace("HTML page has little main body after removing nav/script/footer.", "Trang HTML còn ít nội dung chính sau khi bỏ nav/script/footer.")
    .replace("Content completeness and chunk usefulness.", "Ảnh hưởng độ đầy đủ nội dung và độ hữu ích của chunk.")
    .replace("Review whether these pages are true content or navigation pages.", "Rà soát xem đây là trang nội dung thật hay trang điều hướng.");
}
