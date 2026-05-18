"use client";

import { useState } from "react";
import { BarChart3, Download, Filter, LineChart, PieChart, Presentation, TrendingUp } from "lucide-react";
import {
  biTables,
  executiveKpis,
  operationalKpis,
  questionCategories,
  segmentHeatmap,
  sourceDistribution,
  usageTrend,
} from "@/lib/mock/ops";
import { ActionButton, FilterSelect, MetricCard, ModuleBody, ModuleHeader, ModuleShell, Panel } from "@/components/dashboard/Primitives";
import { CompactAreaChart, CompactBarChart, DonutChartPanel, SegmentHeatmap } from "@/components/dashboard/Charts";

const tabs = [
  { id: "operational", label: "Vận hành" },
  { id: "analytical", label: "Phân tích" },
  { id: "executive", label: "Điều hành" },
] as const;

export function BiConsole() {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("operational");
  const kpis = active === "executive" ? executiveKpis : operationalKpis;

  return (
    <ModuleShell>
      <ModuleHeader
        eyebrow="Dashboard BI"
        title="Không gian Business Intelligence"
        description="Dashboard vận hành, phân tích và điều hành với bộ lọc, biểu đồ, bảng và dữ liệu drill-down."
        actions={
          <>
            <FilterSelect label="Ngày" options={["Hôm nay", "7 ngày", "30 ngày", "Quý"]} />
            <FilterSelect label="Nhóm" options={["Tất cả", "Tuyển sinh", "Đào tạo", "Sinh viên", "Nghiên cứu"]} />
            <ActionButton><span className="inline-flex items-center gap-2"><Download className="h-3.5 w-3.5" /> Xuất file</span></ActionButton>
          </>
        }
      />
      <ModuleBody>
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-white p-2 shadow-panel">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  active === tab.id ? "bg-teal text-white" : "text-slate-700 hover:bg-mist"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {kpis.map((item, index) => (
              <MetricCard key={item.label} icon={[TrendingUp, BarChart3, LineChart, PieChart, Presentation][index % 5]} {...item} />
            ))}
          </div>

          {active === "operational" ? <OperationalDashboard /> : active === "analytical" ? <AnalyticalDashboard /> : <ExecutiveDashboard />}
        </div>
      </ModuleBody>
    </ModuleShell>
  );
}

function OperationalDashboard() {
  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <Panel title="Sử dụng thời gian thực" subtitle="Chat, lượt gọi API, người dùng hoạt động" className="xl:col-span-7">
        <CompactAreaChart data={usageTrend} xKey="day" areas={["chats", "api", "users"]} height={260} />
      </Panel>
      <Panel title="Cảnh báo QA và nội dung" subtitle="Cơ cấu vận hành" className="xl:col-span-5">
        <CompactBarChart
          data={[
            { name: "T2", alerts: 2, content: 18 },
            { name: "T3", alerts: 4, content: 21 },
            { name: "T4", alerts: 3, content: 28 },
            { name: "T5", alerts: 5, content: 24 },
            { name: "T6", alerts: 5, content: 31 },
          ]}
          bars={["alerts", "content"]}
          height={260}
        />
      </Panel>
      <InsightTable />
    </div>
  );
}

function AnalyticalDashboard() {
  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <Panel title="Nhóm câu hỏi" subtitle="Phân phối intent người dùng" className="xl:col-span-4">
        <DonutChartPanel data={questionCategories} height={250} />
      </Panel>
      <Panel title="Phân phối nguồn" subtitle="Mức dùng nguồn theo nhóm" className="xl:col-span-5">
        <CompactBarChart data={sourceDistribution} xKey="source" bars={["admissions", "training", "research"]} height={250} />
      </Panel>
      <Panel title="Heatmap tương tác" subtitle="Nhóm theo ngày trong tuần" className="xl:col-span-3">
        <SegmentHeatmap rows={segmentHeatmap} />
      </Panel>
      <Panel title="Tăng trưởng và tương tác" subtitle="Xu hướng theo nhóm người dùng" className="xl:col-span-8">
        <CompactAreaChart data={usageTrend} xKey="day" areas={["users", "chats"]} height={240} />
      </Panel>
      <Panel title="Ghi chú sử dụng dữ liệu" subtitle="Tóm tắt drill-down" className="xl:col-span-4">
        <div className="grid gap-2">
          {["PDF đào tạo là nguồn mạnh nhất", "Câu hỏi tuyển sinh tăng cao vào buổi chiều", "Trang lab nghiên cứu cần metadata tốt hơn", "Thông báo sinh viên mới nhưng dung lượng nhỏ hơn"].map((item) => (
            <div key={item} className="rounded-lg border border-line bg-mist p-2 text-sm font-medium text-ink">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ExecutiveDashboard() {
  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <Panel title="Tổng quan chiến lược" subtitle="Mức sử dụng, chất lượng và sức khỏe" className="xl:col-span-8">
        <CompactAreaChart data={usageTrend} xKey="day" areas={["chats", "users"]} height={260} />
      </Panel>
      <Panel title="Tóm tắt điều hành" subtitle="Điểm nổi bật cho báo cáo" className="xl:col-span-4">
        <div className="grid gap-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase text-emerald-700">Điểm mạnh</p>
            <p className="mt-1 text-sm font-medium text-ink">Bộ dữ liệu HUS/VNU-HUS đã xử lý OCR và runtime Gemini chạy server-side.</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase text-amber-800">Theo dõi</p>
            <p className="mt-1 text-sm font-medium text-ink">Embeddings/vector DB vẫn là bước nâng cấp để tăng recall retrieval.</p>
          </div>
          <div className="rounded-lg border border-line bg-mist p-3">
            <p className="text-xs font-semibold uppercase text-slate-600">Tiếp theo</p>
            <p className="mt-1 text-sm font-medium text-ink">Đưa dữ liệu production vào managed DB/storage và bật monitoring backend.</p>
          </div>
        </div>
      </Panel>
      <InsightTable />
    </div>
  );
}

function InsightTable() {
  return (
    <Panel title="Bảng drill-down BI" subtitle="Metric chính, chủ sở hữu và biến động" className="xl:col-span-12">
      <div className="overflow-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="text-slate-500">
            <tr className="border-b border-line">
              <th className="py-2 pr-3">Metric</th>
              <th className="py-2 pr-3">Giá trị</th>
              <th className="py-2 pr-3">Biến động</th>
              <th className="py-2 pr-3">Phụ trách</th>
            </tr>
          </thead>
          <tbody>
            {biTables.map((row) => (
              <tr key={row.metric} className="border-b border-line hover:bg-mist">
                <td className="py-2 pr-3 font-semibold text-ink">{row.metric}</td>
                <td className="py-2 pr-3">{row.value}</td>
                <td className="py-2 pr-3">{row.change}</td>
                <td className="py-2 pr-3">{row.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
