"use client";

import { Activity, BarChart3, Clock3, DatabaseZap, GitBranch, LayoutTemplate, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ObservabilitySummary, QualityDimension } from "@/lib/server/dataLayerOutputs";
import { Panel, StatusBadge } from "@/components/dashboard/Primitives";
import { QualityRadarChart } from "@/components/data-layer/DataLayerCharts";

export function QualityDimensions({ observability }: Readonly<{ observability: ObservabilitySummary }>) {
  const dimensions = observability.quality_dimensions ?? [];
  const scoreCards = observability.score_cards ?? [];
  const pillars = [
    pillar("Độ mới", Clock3, findScore(dimensions, "Freshness"), "đã có lần chạy pipeline local mới nhất", findIssue(dimensions, "Freshness"), "Chạy lại pipeline trước demo/bàn giao cuối."),
    pillar("Dung lượng", DatabaseZap, findScore(dimensions, "Volume"), "raw/content/feature nằm trong khoảng mục tiêu", findIssue(dimensions, "Volume"), "Giữ kích thước dataset ổn định cho demo."),
    pillar("Phân phối", BarChart3, findScore(dimensions, "Consistency"), "chuẩn hóa category/source/type", findIssue(dimensions, "Consistency"), "Rà HTML mỏng và bản ghi encoding."),
    pillar("Schema", LayoutTemplate, findScore(dimensions, "Schema"), "catalog/schema/dictionary đã xuất output", findIssue(dimensions, "Schema"), "Giữ registry đồng bộ với trường output."),
    pillar("Lineage", GitBranch, Number(scoreCards.find((item) => String(item.name).includes("Governance"))?.score ?? 94), "lineage raw -> processed -> features", 0, "Sinh lại lineage cùng pipeline."),
  ];

  return (
    <div className="grid gap-3">
      <Panel title="Trụ cột observability" subtitle="Độ mới, dung lượng, phân phối, schema và lineage">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.name} className="rounded-lg border border-line bg-mist p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-teal"><Icon className="h-4 w-4" /></span>
                  <StatusBadge status={statusTone(item.score)} />
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{item.name}</p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span className="text-2xl font-bold text-teal">{item.score}%</span>
                  <span className="text-xs font-semibold text-slate-500">{item.issues} issue</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full" style={{ width: `${Math.max(4, item.score)}%`, background: colorTone(item.score) }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.metric}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.action}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Chiều chất lượng dữ liệu" subtitle="Radar và thẻ xử lý từ output pipeline thật">
        <div className="grid gap-3 xl:grid-cols-[390px_1fr]">
          <div className="rounded-lg border border-line bg-mist p-3">
            <QualityRadarChart data={dimensions.map((item) => ({ name: translateDimensionName(item.name.replace("/Readiness", "")), score: item.score }))} />
            <p className="mt-2 text-xs text-slate-500">Thang 0-100. Trục thấp hơn là mục tiêu xử lý tiếp theo.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dimensions.map((item) => (
              <DimensionCard key={item.name} item={item} />
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Điểm được tính từ output pipeline local. Các điểm xu hướng ước lượng được đánh dấu rõ là estimate cho demo.</p>
      </Panel>
    </div>
  );
}

function DimensionCard({ item }: Readonly<{ item: QualityDimension }>) {
  return (
    <div className="rounded-lg border border-line bg-mist p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-5 text-ink" title={item.name}>{translateDimensionName(item.name)}</p>
          <p className="mt-1 text-xs text-slate-500">{translateDimensionText(item.metric)}</p>
        </div>
        <StatusBadge status={item.status === "healthy" ? "healthy" : item.status === "critical" ? "critical" : "warning"} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-teal">
          {item.score >= 85 ? <ShieldCheck className="h-5 w-5" /> : item.score >= 65 ? <Activity className="h-5 w-5" /> : <Activity className="h-5 w-5 text-rose-700" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Điểm</span>
            <span className="font-bold text-ink">{item.score}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-white">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(4, item.score)}%`, background: colorTone(item.score) }} />
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-white p-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>{item.issue_count} issue</span>
          <span>{item.basis ?? "local pipeline"}</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{translateDimensionText(item.recommended_action)}</p>
      </div>
    </div>
  );
}

function pillar(name: string, icon: LucideIcon, score: number, metric: string, issues: number, action: string) {
  return { name, icon, score: Math.round(score * 10) / 10, metric, issues, action };
}

function findScore(dimensions: QualityDimension[], name: string) {
  return Number(dimensions.find((item) => item.name.includes(name))?.score ?? 0);
}

function findIssue(dimensions: QualityDimension[], name: string) {
  return Number(dimensions.find((item) => item.name.includes(name))?.issue_count ?? 0);
}

function statusTone(score: number) {
  if (score >= 85) return "healthy";
  if (score >= 65) return "warning";
  return "critical";
}

function colorTone(score: number) {
  if (score >= 85) return "#0f766e";
  if (score >= 65) return "#b45309";
  return "#be123c";
}

function translateDimensionName(name: string) {
  return name
    .replace("Content Readiness", "Sẵn sàng nội dung")
    .replace("AI Readiness", "Sẵn sàng AI")
    .replace("Governance Score", "Điểm governance")
    .replace("Raw Integrity", "Toàn vẹn raw")
    .replace("Freshness", "Độ mới")
    .replace("Volume", "Dung lượng")
    .replace("Schema", "Schema")
    .replace("Completeness", "Độ đầy đủ")
    .replace("Distribution", "Phân phối")
    .replace("Consistency", "Nhất quán")
    .replace("Lineage", "Lineage")
    .replace("Accuracy", "Độ đúng");
}

function translateDimensionText(value?: string) {
  return String(value ?? "")
    .replace("Content documents with usable processed text", "Tài liệu nội dung có processed text dùng được")
    .replace("AI-usable content after OCR and chunking", "Nội dung dùng được cho AI sau OCR và chunking")
    .replace("Governance artifacts generated", "Artifact governance đã được sinh")
    .replace("Raw files inspected and checksummed", "File raw đã được kiểm tra và checksum")
    .replace("Last local pipeline run", "Lần chạy pipeline local mới nhất")
    .replace("Raw/content/feature volume", "Dung lượng raw/content/feature")
    .replace("Schema and data contracts", "Schema và data contract")
    .replace("Metadata completeness", "Độ đầy đủ metadata")
    .replace("Category and source consistency", "Độ nhất quán category và source")
    .replace("Keep scheduled validation and refresh RAG index", "Duy trì validation định kỳ và refresh RAG index")
    .replace("Review missing metadata cells", "Rà các ô metadata còn thiếu")
    .replace("Run OCR queue for flagged PDFs", "Chạy OCR cho PDF đã gắn cờ")
    .replace("Monitor pipeline outputs", "Theo dõi output pipeline");
}
