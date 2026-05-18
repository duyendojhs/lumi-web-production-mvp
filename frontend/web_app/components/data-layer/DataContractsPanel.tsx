"use client";

import type { ExpectationContracts, ExpectationResults } from "@/lib/server/dataLayerOutputs";
import { Panel, StatusBadge } from "@/components/dashboard/Primitives";

export function DataContractsPanel({ contracts, results }: Readonly<{ contracts: ExpectationContracts; results: ExpectationResults }>) {
  const rows = results.results ?? [];
  return (
    <Panel title="Hợp đồng dữ liệu & expectation" subtitle={contracts.suite_name ?? "lumi_local_data_contracts"}>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="sticky top-0 z-10 bg-white text-slate-500">
            <tr className="border-b border-line">
              <th className="py-2 pr-3">Expectation</th>
              <th className="py-2 pr-3">Loại</th>
              <th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2 pr-3">Tỷ lệ đạt</th>
              <th className="py-2 pr-3">Ảnh hưởng</th>
              <th className="py-2 pr-3">Phụ trách</th>
              <th className="py-2 pr-3">Lần kiểm tra</th>
              <th className="py-2 pr-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-line hover:bg-mist">
                <td className="py-2 pr-3">
                  <p className="font-semibold text-ink" title={row.name}>{row.name}</p>
                  <p className="mt-0.5 text-slate-500">{translateDescription(row.description)}</p>
                </td>
                <td className="py-2 pr-3">{expectationType(row.name)}</td>
                <td className="py-2 pr-3"><StatusBadge status={row.status === "warn" ? "warning" : row.status} /></td>
                <td className="py-2 pr-3 font-semibold text-ink">{row.pass_rate}%</td>
                <td className="py-2 pr-3">{row.affected_rows}</td>
                <td className="py-2 pr-3">{row.owner}</td>
                <td className="py-2 pr-3">{new Date(row.last_validated).toLocaleString()}</td>
                <td className="py-2 pr-3">
                  <span className="rounded-md bg-mist px-2 py-1 text-[11px] font-semibold text-slate-700">{actionFor(row.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function expectationType(name: string) {
  if (name.includes("schema") || name.includes("file_type")) return "schema";
  if (name.includes("source") || name.includes("category")) return "metadata";
  if (name.includes("duplicate") || name.includes("checksum")) return "integrity";
  if (name.includes("processed") || name.includes("pdf")) return "readiness";
  return "quality";
}

function actionFor(status: string) {
  if (status === "pass") return "theo dõi";
  if (status === "warn") return "rà soát";
  return "sửa trước deploy";
}

function translateDescription(value: string) {
  return value
    .replace("No missing required fields", "Không thiếu trường bắt buộc")
    .replace("PDFs that need OCR are tracked", "PDF cần OCR đã được theo dõi")
    .replace("Content documents have processed text", "Tài liệu nội dung đã có text xử lý")
    .replace("Catalog has stable schema", "Catalog có schema ổn định")
    .replace("Document ids are unique", "Document id là duy nhất")
    .replace("Source/category metadata is present", "Metadata nguồn/nhóm đã có")
    .replace("Duplicate checksums are flagged", "Checksum trùng được gắn cờ");
}
