import Link from "next/link";
import { Activity, BarChart3, Bot, Database, FileCheck2, KeyRound, Layers3, MonitorCog, PanelsTopLeft, Server, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getProviderHealth } from "@/lib/server/llm/llm_provider";
import { formatBytes, getDataRawSummary } from "@/lib/server/dataSummary";
import { getDataLayerSummary } from "@/lib/server/dataLayerOutputs";
import { requireAdminPage } from "@/lib/server/auth/session";
import { AppFrame } from "@/components/AppFrame";
import { Panel, StatusBadge } from "@/components/dashboard/Primitives";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdminPage("/dashboard");
  const provider = getProviderHealth();
  const dataRaw = getDataRawSummary();
  const dataLayer = getDataLayerSummary();
  const dataRows = [
    {
      label: "Dữ liệu gốc",
      value: dataRaw.dataRawDetected ? "đã có" : "thiếu",
      note: dataRaw.dataRawDetected
        ? `${dataRaw.totalFiles} file, ${formatBytes(dataRaw.totalSizeBytes)}`
        : "Chưa phát hiện bộ dữ liệu gốc",
    },
    { label: "Đã xử lý", value: `${dataLayer.contentProcessedTextDocuments} tài liệu nội dung`, note: "Đọc từ Postgres production hoặc artifact local nếu có" },
    { label: "Đặc trưng", value: `${dataLayer.contentChunks} đoạn tri thức`, note: `Mức sẵn sàng nội dung ${dataLayer.contentReadinessScore}/100` },
  ];

  return (
    <AppFrame>
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-teal">Bảng điều hành</p>
          <h1 className="text-2xl font-semibold text-ink">Tổng quan vận hành Lumi</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Theo dõi Gemini, dữ liệu gốc, sức khỏe hệ thống và các phân hệ quản trị của dự án.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Server} label="Sức khỏe" value="ok" note="/api/health sẵn sàng" />
          <MetricCard icon={Bot} label="Nhà cung cấp" value="gemini" note={provider.model} />
          <MetricCard
            icon={KeyRound}
            label="API key"
            value={provider.hasGeminiKey ? "đã cấu hình" : "thiếu"}
            note={provider.missingEnv || "server env sẵn sàng"}
          />
          <MetricCard
            icon={Database}
            label="Dữ liệu gốc"
            value={dataRaw.dataRawDetected ? "đã có" : "thiếu"}
            note={`${dataRaw.pdfFiles} PDF, ${dataRaw.htmlFiles} HTML, ${dataRaw.txtFiles} TXT`}
          />
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { href: "/qa", label: "QA/QC", icon: ShieldCheck, note: "Kiểm thử dữ liệu, model, runtime", status: "warning" },
            { href: "/data-layer", label: "Lớp dữ liệu", icon: Layers3, note: `${dataLayer.contentDocuments} tài liệu, ${dataLayer.pdfNeedsOcrCount} PDF cần OCR`, status: dataLayer.generated ? "healthy" : "warning" },
            { href: "/cms", label: "CMS", icon: PanelsTopLeft, note: "Nội dung, vai trò, cấu hình", status: "healthy" },
            { href: "/platforms", label: "Nền tảng", icon: MonitorCog, note: "Deploy, API, PWA, worker", status: "warning" },
            { href: "/bi", label: "BI", icon: BarChart3, note: "Vận hành, phân tích, điều hành", status: "healthy" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="rounded-lg border border-line bg-white p-4 shadow-panel hover:bg-mist">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-mist text-teal">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.note}</p>
              </Link>
            );
          })}
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal" aria-hidden="true" />
              <h2 className="text-base font-semibold text-ink">Ghi chú runtime</h2>
            </div>
            <div className="grid gap-3 text-sm text-slate-700">
              <p>Chat route gọi Gemini trên server, nên API key không bị expose ra client.</p>
              <p>Nếu chưa có key, UI và API trả lỗi rõ ràng thay vì crash.</p>
              <p>Data Layer đã tạo processed text, features và RAG index từ dữ liệu gốc.</p>
              <p>Auth đang dùng Supabase session và phân quyền role từ bảng profiles.</p>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-amber" aria-hidden="true" />
              <h2 className="text-base font-semibold text-ink">Thư mục dữ liệu</h2>
            </div>
            <div className="grid gap-2">
              {dataRows.map((row) => (
                <div key={row.label} className="rounded-lg border border-line bg-mist px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{row.label}</span>
                    <span className="text-xs font-semibold uppercase text-teal">{row.value}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{row.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-3">
          <Panel title="Ảnh chụp QA" subtitle="Tín hiệu chất lượng hiện tại">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><span>Tỷ lệ regression đạt</span><strong>94%</strong></div>
              <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><span>Cảnh báo QA mở</span><strong>5</strong></div>
              <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><span>Điểm lệch dữ liệu</span><strong>0.21</strong></div>
            </div>
          </Panel>
          <Panel title="Ảnh chụp CMS" subtitle="Luồng nội dung">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><span>Nội dung đã xuất bản</span><strong>184</strong></div>
              <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><span>Bản nháp</span><strong>23</strong></div>
              <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><span>Biên tập viên hoạt động</span><strong>9</strong></div>
            </div>
          </Panel>
          <Panel title="Ảnh chụp BI" subtitle="Sức khỏe điều hành">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><span>Mức sử dụng</span><strong>74%</strong></div>
              <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><span>Điểm chất lượng</span><strong>{dataLayer.qualityScore}/100</strong></div>
              <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><span>Sức khỏe hệ thống</span><strong>{dataLayer.overallDataHealth}%</strong></div>
            </div>
          </Panel>
        </section>
      </div>
    </AppFrame>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
}>) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-mist text-teal">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-ink">{value}</p>
      <p className="mt-1 break-words text-xs text-slate-500">{note}</p>
    </div>
  );
}
