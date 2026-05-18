"use client";

import { AlertTriangle, Archive, Bot, Database, FileCheck2, FileText, Gauge, Layers3, ShieldCheck, Workflow } from "lucide-react";
import type { DataLineage, DataProductsReport, DataStatistics, ObservabilitySummary, OcrQueueReport, ProductionReadiness } from "@/lib/server/dataLayerOutputs";
import { MetricCard, Panel, StatusBadge } from "@/components/dashboard/Primitives";
import { FileTypeDonut, FreshnessTimeline, HealthGauge, HorizontalIssueChart, QualityRadarChart, SourceDomainCards, StackedCategoryStatusChart } from "@/components/data-layer/DataLayerCharts";
import { DataProductCards } from "@/components/data-layer/DataProductCards";

interface Props {
  statistics: DataStatistics;
  observability: ObservabilitySummary;
  lineage: DataLineage;
  ocrQueue: OcrQueueReport;
  products: DataProductsReport;
  productionReadiness: ProductionReadiness;
}

export function DataLayerOverview({ statistics, observability, lineage, ocrQueue, products, productionReadiness }: Readonly<Props>) {
  const executive = observability.executive_summary ?? {};
  const overallHealth = Number(statistics.overall_data_health ?? statistics.content_readiness_score ?? 0);
  const issueRows = objectToRows(statistics.issue_counts).slice(0, 8);
  const fileRows = objectToRows(statistics.content_file_type_distribution ?? statistics.file_type_distribution);
  const mainSources = Array.isArray(executive.main_sources) ? executive.main_sources.map(String) : ["hus.vnu.edu.vn", "tuyensinh.hus.vnu.edu.vn", "local"];
  const scoreCards = (observability.score_cards ?? []).map((item) => ({
    name: translateMetricName(String(item.name)),
    score: Number(item.score ?? 0),
    weight: String(item.weight ?? ""),
  }));

  return (
    <div className="grid gap-3">
      <section className="grid items-stretch gap-3 xl:grid-cols-[0.4fr_0.6fr]">
        <Panel title="Sức khỏe điều hành" subtitle="Điểm tổng hợp có giải thích trọng số">
          <div className="grid h-full content-between gap-3">
            <HealthGauge score={overallHealth} label="Sức khỏe tổng thể" breakdown={scoreCards} />
            <div className="grid gap-2">
              <AlertRow label="Nội dung dùng được" value={String(executive.ai_usable_content ?? `${statistics.content_processed_text_documents}/${statistics.content_documents}`)} />
              <AlertRow label="Nút thắt lớn nhất" value={translateSummary(String(executive.biggest_blocker ?? `${statistics.pdf_needs_ocr_count} PDFs need OCR`))} tone="warning" />
              <AlertRow label="Việc tiếp theo" value={translateSummary(String(executive.next_best_action ?? "Run OCR queue"))} tone="warning" />
              <div className="rounded-lg border border-line bg-mist p-2">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Nguồn chính</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {mainSources.map((source) => <span key={source} className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-700" title={source}>{source}</span>)}
                </div>
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="Bản đồ lineage" subtitle="Raw -> ingestion -> processing -> features -> governance -> AI/BI">
          <LineageMap statistics={statistics} lineage={lineage} observability={observability} />
        </Panel>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <MetricCard icon={Database} label="File gốc" value={String(statistics.total_raw_files ?? 0)} note="đã quét toàn bộ" status="healthy" />
        <MetricCard icon={FileCheck2} label="Tài liệu nội dung" value={String(statistics.content_documents ?? 0)} note="PDF/HTML/TXT" status="healthy" />
        <MetricCard icon={Archive} label="Đã loại" value={String((statistics.manifest_files ?? 0) + (statistics.system_files ?? 0) + (statistics.archive_files ?? 0))} note="manifest/readme/archive" status="review" />
        <MetricCard icon={FileText} label="Đã xử lý" value={String(statistics.content_processed_text_documents ?? 0)} note="processed text" status="ready" />
        <MetricCard icon={Layers3} label="Đoạn tri thức" value={String(statistics.content_chunks ?? 0)} note="đơn vị AI/search" status="ready" />
        <MetricCard icon={AlertTriangle} label="Hàng đợi OCR" value={String(ocrQueue.total_pdf_needing_ocr ?? statistics.pdf_needs_ocr_count ?? 0)} note="quy trình OCR" status="healthy" />
        <MetricCard icon={Gauge} label="Sẵn sàng AI" value={`${statistics.ai_readiness_score ?? 0}/100`} note="coverage sau OCR" status="healthy" />
        <MetricCard icon={ShieldCheck} label="Governance" value={`${statistics.governance_score ?? 0}/100`} note="schema/lineage/policy" status="healthy" />
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Panel title="Cơ cấu loại file" subtitle="Tỷ lệ tài liệu nội dung theo loại" className="xl:col-span-3">
          <FileTypeDonut data={fileRows} />
        </Panel>
        <Panel title="Radar chất lượng" subtitle="8 chiều, thang 0-100" className="xl:col-span-4">
          <QualityRadarChart data={(observability.quality_dimensions ?? []).map((item) => ({ name: translateMetricName(String(item.name).replace("/Readiness", "")), score: item.score }))} height={250} />
        </Panel>
        <Panel title="Xu hướng freshness / volume" subtitle="Timeline từ các lần chạy local gần nhất" className="xl:col-span-5">
          <FreshnessTimeline data={observability.pipeline_runs ?? []} />
        </Panel>
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Panel title="Pareto issue" subtitle="Các điểm nghẽn theo số bản ghi ảnh hưởng" className="xl:col-span-4">
          <HorizontalIssueChart data={issueRows} />
        </Panel>
        <Panel title="Nhóm x trạng thái" subtitle="X = nhóm nội dung; stack = trạng thái" className="xl:col-span-5">
          <StackedCategoryStatusChart data={observability.category_status ?? []} />
        </Panel>
        <Panel title="Tên miền nguồn" subtitle="Tài liệu/chunk theo nguồn public hoặc local" className="xl:col-span-3">
          <SourceDomainCards data={observability.source_domain_cards ?? []} />
        </Panel>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_360px_360px]">
        <Panel title="Việc tăng điểm nhiều nhất" subtitle="Ước lượng tác động từ pipeline thật">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {(observability.improvement_actions ?? []).map((item) => (
              <div key={String(item.action)} className="rounded-lg border border-line bg-mist p-3">
                <p className="text-sm font-semibold leading-5 text-ink">{String(item.action)}</p>
                <p className="mt-2 text-lg font-bold text-teal">{String(item.estimated_gain)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{String(item.basis)}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Vì sao chưa tuyệt đối?" subtitle="Ràng buộc thật từ pipeline hiện tại">
          <div className="grid gap-2 text-xs">
            {[
              `${statistics.pdf_needs_ocr_count ?? 0} PDF còn cần OCR trước khi phủ AI đầy đủ.`,
              `${statistics.issue_counts?.possible_mojibake ?? 0} bản ghi nghi lỗi encoding/mojibake.`,
              `${statistics.issue_counts?.html_short_body ?? 0} trang HTML mỏng cần rà soát.`,
              `${statistics.missing_summary?.total_missing_cells ?? 0} ô thiếu trong bảng/manifest hỗ trợ.`,
              "Vector index và lịch sử monitoring production vẫn là roadmap.",
            ].map((item) => <p key={item} className="rounded-lg bg-mist px-3 py-2 leading-5 text-slate-700">{item}</p>)}
          </div>
        </Panel>
        <Panel title="Công thức điểm" subtitle="Cách hệ thống tính sức khỏe">
          <div className="grid gap-2 text-xs">
            {scoreCards.slice(0, 5).map((item) => (
              <div key={item.name} className="rounded-lg border border-line bg-mist p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold leading-4 text-ink" title={item.name}>{item.name}</span>
                  <span className="font-bold text-teal">{item.score}%</span>
                </div>
                <p className="mt-1 leading-5 text-slate-500">{item.weight}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Mức sẵn sàng production" subtitle="Năng lực đã có ở local so với roadmap">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
          <ReadinessItem label="OCR batch" value={statusValue(productionReadiness.ocrBatch, "processed_items", "thủ công")} status={Object.keys(productionReadiness.ocrBatch).length ? "ready" : "planned"} />
          <ReadinessItem label="RAG index" value={String(productionReadiness.ragIndex.embedding_status ? `keyword + ${productionReadiness.ragIndex.embedding_status}` : "keyword sẵn sàng")} status={Object.keys(productionReadiness.ragIndex).length ? "ready" : "planned"} />
          <ReadinessItem label="File connector" value="đã triển khai" status="ready" />
          <ReadinessItem label="DB/API/Kafka" value="demo/kế hoạch" status="planned" />
          <ReadinessItem label="Snapshot" value={productionReadiness.latestSnapshot.version ? "đã triển khai" : "chạy snapshot"} status={productionReadiness.latestSnapshot.version ? "ready" : "planned"} />
          <ReadinessItem label="Lịch sử chạy" value={`${productionReadiness.runHistory.length} lần`} status={productionReadiness.runHistory.length ? "ready" : "planned"} />
          <ReadinessItem label="RBAC" value={`${productionReadiness.rbac.currentRole}`} status="ready" />
        </div>
      </Panel>

      <Panel title="Sẵn sàng deploy" subtitle="Cloud mode dùng Vercel, managed Postgres, object storage và Gemini env server-side">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-lg bg-mist px-3 py-2 font-semibold text-slate-700">Runtime: {productionReadiness.deployment.currentMode}</span>
          <span className="rounded-lg bg-mist px-3 py-2 font-semibold text-slate-700">APP_ENV: {productionReadiness.deployment.appEnv}</span>
          <span className="rounded-lg bg-mist px-3 py-2 font-semibold text-slate-700">Vercel: {productionReadiness.deployment.vercel ? "có" : "chưa phát hiện"}</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {productionReadiness.deployment.rows.map((row) => (
            <div key={row.label} className="rounded-lg border border-line bg-mist p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-5 text-ink">{row.label}</p>
                <StatusBadge status={row.status === "missing" ? "critical" : row.status === "local" ? "active" : row.status} />
              </div>
              <p className="mt-2 break-words text-xs leading-5 text-slate-600">{row.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <DataProductCards products={products} compact />
    </div>
  );
}

function ReadinessItem({ label, value, status }: Readonly<{ label: string; value: string; status: string }>) {
  return (
    <div className="rounded-lg border border-line bg-mist p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 break-words text-xs leading-4 text-slate-600">{value}</p>
    </div>
  );
}

function statusValue(source: Record<string, unknown>, key: string, fallback: string) {
  const value = source[key];
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function AlertRow({ label, value, tone = "active" }: Readonly<{ label: string; value: string; tone?: string }>) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-line bg-mist px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold leading-5 text-ink" title={value}>{value}</p>
      </div>
      <StatusBadge status={tone} />
    </div>
  );
}

function LineageMap({ statistics, lineage, observability }: Readonly<{ statistics: DataStatistics; lineage: DataLineage; observability: ObservabilitySummary }>) {
  const stages = [
    { name: "Raw", count: statistics.total_raw_files ?? 0, path: "data/raw", status: "ready", icon: Database, note: `${statistics.pdf_needs_ocr_count ?? 0} OCR` },
    { name: "Ingestion", count: statistics.total_documents ?? 0, path: "metadata/catalog", status: "ready", icon: Workflow, note: "catalog" },
    { name: "Processing", count: statistics.content_processed_text_documents ?? 0, path: "processed/text", status: "warning", icon: FileText, note: "coverage gap" },
    { name: "Features", count: statistics.content_chunks ?? 0, path: "features/chunks", status: "ready", icon: Layers3, note: "search ready" },
    { name: "Governance", count: (lineage.stages ?? []).length || 5, path: "metadata/*.json", status: "ready", icon: ShieldCheck, note: "schemas" },
    { name: "AI / BI", count: 2, path: "chat + dashboard", status: "active", icon: Bot, note: "consumers" },
  ];
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div key={stage.name} className="relative min-h-[128px] rounded-xl border border-line bg-mist p-3">
              {index < stages.length - 1 ? (
                <div className="absolute -right-4 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-xs font-bold text-slate-500 xl:grid">-&gt;</div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-teal"><Icon className="h-4 w-4" /></span>
                <StatusBadge status={stage.status} />
              </div>
              <p className="mt-2 text-sm font-semibold text-ink">{stage.name}</p>
              <p className="text-xl font-semibold text-teal">{stage.count}</p>
              <p className="break-words text-[11px] leading-4 text-slate-500" title={stage.path}>{stage.path}</p>
              <span className="mt-2 inline-flex rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">{stage.note}</span>
            </div>
          );
        })}
      </div>
      <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
        {(observability.lineage_impact ?? []).map((item) => (
          <div key={`${item.from}-${item.to}`} className="rounded-lg border border-line bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="break-words text-xs font-semibold leading-4 text-ink" title={`${item.from} -> ${item.to}`}>{String(item.from)} -&gt; {String(item.to)}</p>
              <span className="rounded-md bg-mist px-2 py-1 text-[11px] font-bold text-teal">{String(item.impact)}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{String(item.note)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function objectToRows(source: Record<string, number> | undefined) {
  return Object.entries(source ?? {})
    .map(([name, value]) => ({ name, value: Number(value) }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.value - a.value);
}

function translateMetricName(value: string) {
  const labels: Record<string, string> = {
    "Overall Data Health": "Sức khỏe dữ liệu",
    "Content Readiness": "Sẵn sàng nội dung",
    "AI Readiness": "Sẵn sàng AI",
    "Governance Score": "Điểm governance",
    "Raw Integrity": "Toàn vẹn raw",
    Freshness: "Độ mới",
    Volume: "Dung lượng",
    Schema: "Schema",
    Completeness: "Độ đầy đủ",
    Validity: "Tính hợp lệ",
    Consistency: "Nhất quán",
    Uniqueness: "Duy nhất",
    "Accuracy/Readiness": "Độ đúng/sẵn sàng",
  };
  return labels[value] ?? value;
}

function translateSummary(value: string) {
  return value
    .replace("No critical content blocker", "Không còn nút thắt nội dung nghiêm trọng")
    .replace("Keep scheduled validation and refresh RAG index", "Duy trì kiểm định định kỳ và refresh RAG index")
    .replace("PDFs need OCR", "PDF cần OCR")
    .replace("metadata cells need review", "ô metadata cần rà soát")
    .replace("Run OCR queue for flagged PDFs", "Chạy OCR cho PDF đã gắn cờ");
}
