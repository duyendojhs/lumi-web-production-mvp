"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Database, Gauge, PlayCircle, RefreshCw, ShieldCheck, TestTube2 } from "lucide-react";
import {
  alerts,
  apiTests,
  confusionMatrix,
  dataQaRows,
  distributionComparison,
  driftTrend,
  errorRateSeries,
  fairnessScores,
  incidents,
  latencySeries,
  metricComparison,
  missingValuesByColumn,
  modelLoss,
  modelVersions,
  prometheusMetrics,
  qaFilters,
  qaStatusBreakdown,
  qaSummary,
  regressionTests,
  resourceUsage,
  ruleViolations,
  sampleRows,
  throughputSeries,
} from "@/lib/mock/qa";
import {
  ActionButton,
  FilterSelect,
  MetricCard,
  ModuleBody,
  ModuleHeader,
  ModuleShell,
  Panel,
  StatusBadge,
} from "@/components/dashboard/Primitives";
import {
  CompactAreaChart,
  CompactBarChart,
  CompactLineChart,
  DonutChartPanel,
  MatrixHeatmap,
  ResourceBars,
} from "@/components/dashboard/Charts";

const tabs = [
  { id: "data", label: "QA dữ liệu", icon: Database },
  { id: "model", label: "QA model", icon: TestTube2 },
  { id: "system", label: "QA hệ thống", icon: ShieldCheck },
  { id: "monitoring", label: "Giám sát", icon: Activity },
] as const;

type QaTab = (typeof tabs)[number]["id"];

export function QaConsole() {
  const [activeTab, setActiveTab] = useState<QaTab>("data");
  const [selectedDataset, setSelectedDataset] = useState(dataQaRows[0].dataset);
  const metrics = useMemo(() => {
    if (activeTab === "data") return qaSummary.data;
    if (activeTab === "model") return qaSummary.model;
    return qaSummary.system;
  }, [activeTab]);

  return (
    <ModuleShell>
      <ModuleHeader
        eyebrow="Phân hệ 03"
        title="Trung tâm QA/QC"
        description="Kiểm soát chất lượng dữ liệu, model, hệ thống và tín hiệu giám sát theo một luồng vận hành gọn."
        actions={
          <>
            <FilterSelect label="Thời gian" options={qaFilters.timeRanges} />
            <FilterSelect label="Bộ dữ liệu" options={qaFilters.datasets} />
            <FilterSelect label="Model" options={qaFilters.models} />
            <FilterSelect label="Trạng thái" options={qaFilters.statuses} />
            <ActionButton>
              <span className="inline-flex items-center gap-2">
                <PlayCircle className="h-3.5 w-3.5" /> Chạy validation
              </span>
            </ActionButton>
            <ActionButton>
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5" /> Tải lại chỉ số
              </span>
            </ActionButton>
          </>
        }
      />
      <ModuleBody>
        <div className="grid gap-3 xl:grid-cols-[180px_1fr]">
          <aside className="rounded-lg border border-line bg-white p-2 shadow-panel">
            <div className="grid gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${active ? "bg-teal text-white" : "text-slate-700 hover:bg-mist"
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg border border-line bg-mist p-3 text-xs text-slate-600">
              <p className="font-semibold text-ink">Runbook QA</p>
              <p className="mt-1">Kiểm tra dữ liệu, chạy regression, đo drift, rồi mới duyệt sẵn sàng deploy.</p>
            </div>
          </aside>

          <section className="grid min-w-0 gap-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              {metrics.map((metric, index) => (
                <MetricCard
                  key={metric.label}
                  icon={[Database, Gauge, AlertTriangle, ShieldCheck, TestTube2, Activity][index % 6]}
                  label={metric.label}
                  value={metric.value}
                  note={metric.note}
                  status={metric.status}
                />
              ))}
            </div>

            {activeTab === "data" ? (
              <DataQaTab selectedDataset={selectedDataset} onSelectDataset={setSelectedDataset} />
            ) : activeTab === "model" ? (
              <ModelQaTab />
            ) : activeTab === "system" ? (
              <SystemQaTab />
            ) : (
              <MonitoringTab />
            )}
          </section>
        </div>
      </ModuleBody>
    </ModuleShell>
  );
}

function DataQaTab({ selectedDataset, onSelectDataset }: Readonly<{ selectedDataset: string; onSelectDataset: (dataset: string) => void }>) {
  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <Panel title="Giá trị thiếu theo cột" subtitle="Tỷ lệ null và trường rỗng" className="xl:col-span-4">
        <CompactBarChart data={missingValuesByColumn} bars={["value"]} height={205} />
      </Panel>
      <Panel title="So sánh phân phối" subtitle="Train so với dữ liệu hiện tại" className="xl:col-span-5">
        <CompactBarChart data={distributionComparison} xKey="bucket" bars={["train", "current"]} height={205} />
      </Panel>
      <Panel title="Trạng thái validation" subtitle="Đạt, cảnh báo, lỗi" className="xl:col-span-3">
        <DonutChartPanel data={qaStatusBreakdown} height={205} />
      </Panel>

      <Panel title="Bảng chất lượng dữ liệu" subtitle="Chọn một bộ dữ liệu để xem chi tiết" className="xl:col-span-8">
        <div className="max-h-[270px] overflow-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 bg-white text-slate-500">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Bộ dữ liệu</th>
                <th className="py-2 pr-3">Bản ghi</th>
                <th className="py-2 pr-3">Missing %</th>
                <th className="py-2 pr-3">Trùng %</th>
                <th className="py-2 pr-3">Drift</th>
                <th className="py-2 pr-3">Validation</th>
              </tr>
            </thead>
            <tbody>
              {dataQaRows.map((row) => (
                <tr
                  key={row.dataset}
                  onClick={() => onSelectDataset(row.dataset)}
                  className={`cursor-pointer border-b border-line hover:bg-mist ${selectedDataset === row.dataset ? "bg-emerald-50/70" : ""}`}
                >
                  <td className="py-2 pr-3 font-semibold text-ink">{row.dataset}</td>
                  <td className="py-2 pr-3">{row.records.toLocaleString()}</td>
                  <td className="py-2 pr-3">{row.missing}%</td>
                  <td className="py-2 pr-3">{row.duplicates}%</td>
                  <td className="py-2 pr-3"><StatusBadge status={row.drift} /></td>
                  <td className="py-2 pr-3"><StatusBadge status={row.validation} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={`Chi tiết: ${selectedDataset}`} subtitle="Vi phạm rule và dòng mẫu" className="xl:col-span-4">
        <div className="grid gap-3">
          <div className="grid gap-2">
            {ruleViolations.map((rule) => (
              <div key={rule.rule} className="rounded-lg border border-line bg-mist p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-ink">{rule.rule}</p>
                  <StatusBadge status={rule.severity} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{rule.dataset} - {rule.count} trường hợp</p>
              </div>
            ))}
          </div>
          <div className="grid gap-1">
            {sampleRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[64px_1fr_70px] gap-2 rounded-md bg-white px-2 py-1.5 text-xs">
                <span className="font-semibold text-slate-500">{row.id}</span>
                <span className="truncate text-ink">{row.title}</span>
                <span className="text-right text-slate-500">{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ModelQaTab() {
  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <Panel title="Train loss và validation loss" subtitle="Theo dõi rủi ro overfit" className="xl:col-span-5">
        <CompactLineChart data={modelLoss} xKey="step" lines={["train", "validation"]} height={220} />
      </Panel>
      <Panel title="So sánh metric" subtitle="Baseline so với hiện tại" className="xl:col-span-4">
        <CompactBarChart data={metricComparison} xKey="metric" bars={["baseline", "current"]} height={220} />
      </Panel>
      <Panel title="Ma trận nhầm lẫn" subtitle="Mẫu phân loại intent" className="xl:col-span-3">
        <MatrixHeatmap matrix={confusionMatrix} labels={["TS", "ĐT", "SV", "NC"]} />
      </Panel>

      <Panel title="Phiên bản model" subtitle="Mức sẵn sàng deploy" className="xl:col-span-7">
        <div className="overflow-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Phiên bản</th>
                <th className="py-2 pr-3">Train acc</th>
                <th className="py-2 pr-3">Val acc</th>
                <th className="py-2 pr-3">F1</th>
                <th className="py-2 pr-3">Drift</th>
                <th className="py-2 pr-3">Sẵn sàng</th>
              </tr>
            </thead>
            <tbody>
              {modelVersions.map((row) => (
                <tr key={row.version} className="border-b border-line">
                  <td className="py-2 pr-3 font-semibold text-ink">{row.version}</td>
                  <td className="py-2 pr-3">{row.trainAcc}%</td>
                  <td className="py-2 pr-3">{row.valAcc}%</td>
                  <td className="py-2 pr-3">{row.f1}</td>
                  <td className="py-2 pr-3"><StatusBadge status={row.drift} /></td>
                  <td className="py-2 pr-3"><StatusBadge status={row.readiness} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Fairness theo nhóm" subtitle="Theo dõi bias/fairness" className="xl:col-span-5">
        <CompactBarChart data={fairnessScores} xKey="group" bars={["baseline", "score"]} height={220} />
      </Panel>
      <Panel title="Regression test mới nhất" subtitle="Ngưỡng kiểm thử và case lỗi" className="xl:col-span-12">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {regressionTests.map((test) => (
            <div key={test.test} className="rounded-lg border border-line bg-mist p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-ink">{test.test}</p>
                <StatusBadge status={test.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{test.owner} - {test.latency}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SystemQaTab() {
  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <Panel title="Latency" subtitle="Trung bình và p95 theo ms" className="xl:col-span-4">
        <CompactLineChart data={latencySeries} xKey="time" lines={["avg", "p95"]} height={210} />
      </Panel>
      <Panel title="Tỷ lệ lỗi" subtitle="Phần trăm theo thời gian" className="xl:col-span-4">
        <CompactAreaChart data={errorRateSeries} xKey="time" areas={["error"]} height={210} />
      </Panel>
      <Panel title="Thông lượng request" subtitle="Request mỗi phút" className="xl:col-span-4">
        <CompactBarChart data={throughputSeries} xKey="time" bars={["requests"]} height={210} />
      </Panel>
      <Panel title="Kiểm thử REST API" subtitle="Trạng thái smoke test" className="xl:col-span-8">
        <div className="overflow-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Endpoint</th>
                <th className="py-2 pr-3">Method</th>
                <th className="py-2 pr-3">Phản hồi</th>
                <th className="py-2 pr-3">Mã trạng thái</th>
                <th className="py-2 pr-3">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {apiTests.map((test) => (
                <tr key={test.endpoint} className="border-b border-line">
                  <td className="py-2 pr-3 font-mono text-ink">{test.endpoint}</td>
                  <td className="py-2 pr-3">{test.method}</td>
                  <td className="py-2 pr-3">{test.responseTime}</td>
                  <td className="py-2 pr-3">{test.statusCode}</td>
                  <td className="py-2 pr-3"><StatusBadge status={test.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="CPU / bộ nhớ" subtitle="Thanh đo kiểu Grafana" className="xl:col-span-4">
        <ResourceBars data={resourceUsage} />
      </Panel>
    </div>
  );
}

function MonitoringTab() {
  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <Panel title="Xu hướng phát hiện drift" subtitle="Điểm theo ngày" className="xl:col-span-5">
        <CompactAreaChart data={driftTrend} xKey="day" areas={["score"]} height={220} />
      </Panel>
      <Panel title="Metric kiểu Prometheus" subtitle="Mẫu scrape hiện tại" className="xl:col-span-4">
        <div className="grid gap-2">
          {prometheusMetrics.map((metric) => (
            <code key={metric} className="rounded-md bg-slate-950 px-2 py-1.5 text-xs text-emerald-200">
              {metric}
            </code>
          ))}
        </div>
      </Panel>
      <Panel title="Cảnh báo gần đây" subtitle="Tín hiệu đang mở" className="xl:col-span-3">
        <div className="grid gap-2">
          {alerts.map((alert) => (
            <div key={`${alert.time}-${alert.title}`} className="rounded-lg border border-line bg-mist p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">{alert.time}</span>
                <StatusBadge status={alert.severity} />
              </div>
              <p className="mt-1 text-xs font-semibold text-ink">{alert.title}</p>
              <p className="text-xs text-slate-500">{alert.owner}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Timeline sự cố" subtitle="Sự kiện vận hành gần nhất" className="xl:col-span-12">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {incidents.map((item) => (
            <div key={item.time} className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">{item.time}</span>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-2 text-sm font-medium text-ink">{item.event}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
