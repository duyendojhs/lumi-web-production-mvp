"use client";

import { useState } from "react";
import { BookOpen, Database, FileCheck2, GitBranch, KeyRound, LockKeyhole, ShieldCheck, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DataLineage, ProductionReadiness } from "@/lib/server/dataLayerOutputs";
import { Panel, StatusBadge } from "@/components/dashboard/Primitives";

const tabs = [
  { id: "dictionary", label: "Catalog & từ điển" },
  { id: "lineage", label: "Lineage" },
  { id: "access", label: "Chính sách truy cập" },
  { id: "versioning", label: "Versioning" },
] as const;
const glossary = ["tuyen_sinh", "dao_tao", "nghien_cuu", "sinh_vien", "quy_che", "pdf_scan", "public_hus"];

export function GovernanceTabs({
  lineage,
  accessPolicy,
  dataDictionary,
  productionReadiness,
}: Readonly<{
  lineage: DataLineage;
  accessPolicy: Record<string, unknown>;
  dataDictionary: Record<string, unknown>;
  productionReadiness: ProductionReadiness;
}>) {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("dictionary");
  return (
    <div className="grid gap-3">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <GovCard icon={FileCheck2} label="Schema registry" value="sẵn sàng" status="ready" />
        <GovCard icon={Database} label="Phiên bản dataset" value="local-1.0" status="ready" />
        <GovCard icon={LockKeyhole} label="Chính sách truy cập" value="học thuật công khai" status="ready" />
        <GovCard icon={BookOpen} label="Từ điển dữ liệu" value="sẵn sàng" status="ready" />
        <GovCard icon={GitBranch} label="Lineage" value={`${(lineage.stages ?? []).length || 5} bước`} status="ready" />
      </section>

      <Panel title="Không gian governance" subtitle="Tách rõ phần đã triển khai và phần tích hợp nền tảng theo roadmap">
        <div className="mb-3 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActive(tab.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${active === tab.id ? "bg-teal text-white" : "bg-mist text-slate-700 hover:bg-slate-100"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {active === "dictionary" ? <DictionaryView dataDictionary={dataDictionary} /> : null}
        {active === "lineage" ? <LineageView lineage={lineage} /> : null}
        {active === "access" ? <AccessView accessPolicy={accessPolicy} productionReadiness={productionReadiness} /> : null}
        {active === "versioning" ? <VersioningView productionReadiness={productionReadiness} /> : null}
      </Panel>
      <ConnectorStatus productionReadiness={productionReadiness} />
      <Panel title="Khoảng trống production / nâng cấp tiếp theo" subtitle="Tách khỏi phần Data Layer local đã triển khai">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          {[
            ["OCR batch", "workflow thủ công đã triển khai", "ready"],
            ["Keyword RAG index", "đã triển khai local", "ready"],
            ["Managed DB ingestion", "schema đã sẵn sàng", "planned"],
            ["Object storage", "đã có lớp driver", "active"],
            ["Workers/jobs", "interface đã sẵn sàng", "active"],
            ["Auth/RBAC", "đã có path Supabase", "active"],
          ].map(([label, value, status]) => (
            <div key={label} className="rounded-lg border border-line bg-mist p-3">
              <p className="text-sm font-semibold text-ink">{label}</p>
              <p className="mt-1 text-xs text-slate-500">{value}</p>
              <div className="mt-2"><StatusBadge status={status} /></div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DictionaryView({ dataDictionary }: Readonly<{ dataDictionary: Record<string, unknown> }>) {
  const catalog = dataDictionary.data_catalog as Record<string, string> | undefined;
  const rows = Object.entries(catalog ?? {}).map(([field, description]) => ({
    field,
    entity: "data_catalog",
    type: inferType(field),
    description,
    required: ["document_id", "title", "file_type", "relative_path", "checksum_sha256"].includes(field),
    rule: ruleFor(field),
  }));
  return (
    <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="overflow-auto rounded-lg border border-line">
        <table className="w-full min-w-[760px] bg-white text-left text-xs">
          <thead className="bg-mist text-slate-500">
            <tr className="border-b border-line">
              <th className="px-3 py-2">Trường</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Loại</th>
              <th className="px-3 py-2">Bắt buộc</th>
              <th className="px-3 py-2">Rule chất lượng</th>
              <th className="px-3 py-2">Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className="border-b border-line hover:bg-mist">
                <td className="px-3 py-2 font-semibold text-ink">{row.field}</td>
                <td className="px-3 py-2">{row.entity}</td>
                <td className="px-3 py-2">{row.type}</td>
                <td className="px-3 py-2"><StatusBadge status={row.required ? "ready" : "planned"} /></td>
                <td className="px-3 py-2">{row.rule}</td>
                <td className="px-3 py-2 text-slate-600">{translateDictionaryText(row.description)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-line bg-mist p-3">
        <div className="flex items-center gap-2 font-semibold text-ink"><Tag className="h-4 w-4 text-teal" /> Tag glossary</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {glossary.map((tag) => <span key={tag} className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">{tag}</span>)}
        </div>
        <div className="mt-4 grid gap-2 text-xs">
          <Owner label="Phụ trách" value="Lumi Data Team" />
          <Owner label="Contact" value="demo/local project" />
          <Owner label="SLA" value="refresh trước demo/bàn giao" />
          <Owner label="Phân loại" value="học thuật công khai" />
        </div>
      </div>
    </div>
  );
}

function LineageView({ lineage }: Readonly<{ lineage: DataLineage }>) {
  const stages = lineage.stages ?? [];
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-5">
        {stages.map((stage, index) => (
          <div key={String(stage.name)} className="relative rounded-lg border border-line bg-mist p-3">
            {index < stages.length - 1 ? <div className="absolute -right-3 top-1/2 hidden h-0.5 w-6 bg-line md:block" /> : null}
            <div className="flex items-center justify-between gap-2">
              <GitBranch className="h-4 w-4 text-teal" />
              <StatusBadge status={String(stage.status) === "generated" ? "ready" : "active"} />
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{String(stage.name)}</p>
            <p className="mt-1 break-words text-xs leading-4 text-slate-500" title={String(stage.output_path)}>{String(stage.output_path)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        {stages.map((stage) => (
          <div key={String(stage.name)} className="grid gap-2 rounded-lg border border-line bg-white p-3 md:grid-cols-[170px_1fr_1fr_100px]">
            <div className="flex items-center gap-2 font-semibold text-ink"><GitBranch className="h-4 w-4 text-teal" /> {String(stage.name)}</div>
            <p className="break-words text-xs leading-4 text-slate-600" title={String(stage.input_path)}>{String(stage.input_path)}</p>
            <p className="break-words text-xs leading-4 text-slate-600" title={String(stage.output_path)}>{String(stage.output_path)}</p>
            <StatusBadge status={String(stage.status) === "generated" ? "ready" : "active"} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AccessView({ accessPolicy, productionReadiness }: Readonly<{ accessPolicy: Record<string, unknown>; productionReadiness: ProductionReadiness }>) {
  const policies = accessPolicy.source_policy as string[] | undefined;
  const items = ["học thuật công khai", "raw storage local", "không chứa secret", "không dùng nguồn bắt đăng nhập", "không commit raw bundle lớn"];
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <div className="rounded-lg border border-line bg-mist p-3">
        <div className="flex items-center gap-2 font-semibold text-ink"><LockKeyhole className="h-4 w-4 text-teal" /> Phân loại truy cập</div>
        <div className="mt-3 grid gap-2">
          {items.map((item) => <span key={item} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700">{item}</span>)}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-mist p-3">
        <div className="flex items-center gap-2 font-semibold text-ink"><BookOpen className="h-4 w-4 text-teal" /> Ghi chú chính sách</div>
        <ul className="mt-3 grid gap-2 text-sm text-slate-600">
          {(policies ?? []).map((item) => <li key={item} className="rounded-lg bg-white px-3 py-2">{translatePolicyText(item)}</li>)}
        </ul>
      </div>
      <div className="rounded-lg border border-line bg-mist p-3 xl:col-span-2">
        <div className="flex items-center gap-2 font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-teal" /> RBAC matrix ({productionReadiness.rbac.currentRole})</div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {productionReadiness.rbac.matrix.map((row) => (
            <div key={String(row.role)} className="rounded-lg bg-white p-3">
              <p className="font-semibold text-ink">{String(row.role)}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {((row.permissions as string[]) ?? []).slice(0, 8).map((permission) => <span key={permission} className="rounded-md bg-mist px-2 py-1 text-[10px] font-semibold text-slate-600">{permission}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VersioningView({ productionReadiness }: Readonly<{ productionReadiness: ProductionReadiness }>) {
  const roadmap = [
    ["Phiên bản dataset", "local-1.0", "ready", "Sinh bởi python data\\scripts\\run_data_layer.py"],
    ["DVC", "kế hoạch", "planned", "Theo dõi phiên bản dữ liệu vượt ngoài manifest JSON local."],
    ["S3/HDFS", "kế hoạch", "planned", "Remote/object storage cho quy mô production."],
    ["PostgreSQL/MySQL", "kế hoạch", "planned", "Connector ingest database."],
    ["REST/Webhooks", "kế hoạch", "planned", "Connector ingest API."],
    ["Kafka/RabbitMQ", "kế hoạch", "planned", "Connector ingest streaming."],
    ["Vector DB/RAG", "kế hoạch", "planned", "Embedding index sau khi OCR sạch."],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-lg border border-line bg-white p-3 md:col-span-2 xl:col-span-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">Snapshot local mới nhất</p>
            <p className="mt-1 break-all text-xs leading-5 text-slate-500">{String(productionReadiness.latestSnapshot.snapshot_path ?? "Chạy create_dataset_snapshot.py để tạo snapshot manifest.")}</p>
          </div>
          <StatusBadge status={productionReadiness.latestSnapshot.version ? "ready" : "planned"} />
        </div>
      </div>
      {roadmap.map(([label, value, status, note]) => (
        <div key={label} className="rounded-lg border border-line bg-mist p-3">
          <div className="flex items-center justify-between gap-2">
            <Database className="h-5 w-5 text-teal" />
            <StatusBadge status={status} />
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">{label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
        </div>
      ))}
      <div className="rounded-lg border border-line bg-white p-3 md:col-span-2 xl:col-span-4">
        <div className="flex items-center gap-2 font-semibold text-ink"><KeyRound className="h-4 w-4 text-teal" /> Lệnh tái lập</div>
        <p className="mt-2 break-all rounded-lg bg-mist px-3 py-2 font-mono text-xs leading-5 text-slate-700">Nạp documents, document_files, document_chunks vào Postgres và tạo embedding pgvector</p>
      </div>
    </div>
  );
}

function ConnectorStatus({ productionReadiness }: Readonly<{ productionReadiness: ProductionReadiness }>) {
  const connectors = (productionReadiness.connectors.connectors as Array<Record<string, string>> | undefined) ?? [];
  return (
    <Panel title="Trạng thái connector" subtitle="Connector local đã triển khai và adapter ingest theo roadmap">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {connectors.map((connector) => (
          <div key={connector.name} className="rounded-lg border border-line bg-mist p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{connector.name}</p>
                <p className="mt-1 text-xs text-slate-500">{connector.type} - {connector.mode}</p>
              </div>
              <StatusBadge status={connector.status === "implemented" ? "ready" : connector.status === "demo" ? "active" : "planned"} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{translateConnectorText(connector.description)}</p>
            <p className="mt-2 break-all rounded-md bg-white px-2 py-1 font-mono text-[11px] text-slate-600">{connector.test_command}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function GovCard({ icon: Icon, label, value, status }: Readonly<{ icon: LucideIcon; label: string; value: string; status: string }>) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-panel">
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-mist text-teal"><Icon className="h-4 w-4" /></span>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">{label}</p>
      <p className="mt-1 break-words text-xs leading-4 text-slate-500" title={value}>{value}</p>
    </div>
  );
}

function Owner({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"><span className="font-semibold text-slate-600">{label}</span><span className="truncate text-ink">{value}</span></div>;
}

function inferType(field: string) {
  if (field.includes("is_")) return "boolean";
  if (field.includes("size") || field.includes("count")) return "number";
  if (field.includes("issues")) return "array";
  return "string";
}

function ruleFor(field: string) {
  if (field === "checksum_sha256") return "không null; nên duy nhất";
  if (field === "file_type") return "enum hợp lệ";
  if (field === "category") return "tag chuẩn hóa";
  if (field === "source_url") return "bắt buộc với nguồn public";
  if (field === "document_id") return "id ổn định";
  return "đã mô tả";
}

function translateDictionaryText(value: string) {
  return value
    .replace("Stable document id", "ID tài liệu ổn định")
    .replace("Human readable title", "Tiêu đề dễ đọc")
    .replace("File extension/type", "Định dạng/đuôi file")
    .replace("Path relative to data/raw", "Đường dẫn tương đối từ data/raw")
    .replace("SHA-256 checksum", "Checksum SHA-256")
    .replace("Normalized content category", "Nhóm nội dung đã chuẩn hóa")
    .replace("Public source URL when available", "URL nguồn công khai nếu có");
}

function translatePolicyText(value: string) {
  return value
    .replace("Raw data stays read-only", "Dữ liệu raw chỉ đọc")
    .replace("Do not commit secrets or local credentials", "Không commit secret hoặc credential local")
    .replace("Prefer public academic sources", "Ưu tiên nguồn học thuật công khai")
    .replace("Production storage should use managed DB/object storage", "Production nên dùng managed DB/object storage");
}

function translateConnectorText(value?: string) {
  return String(value ?? "")
    .replace("Local filesystem connector for data/raw", "Connector filesystem local cho data/raw")
    .replace("Database ingestion connector planned", "Connector ingest database theo roadmap")
    .replace("Object storage connector planned", "Connector object storage theo roadmap")
    .replace("API/webhook ingestion connector planned", "Connector ingest API/webhook theo roadmap")
    .replace("Vector database connector planned", "Connector vector database theo roadmap");
}
