"use client";

import { Activity, Boxes, GitBranch, Globe2, PlugZap, Rocket, Smartphone, Wifi } from "lucide-react";
import { integrationFlow, platformCards, releaseNotes, usageTrend } from "@/lib/mock/ops";
import { ActionButton, FilterSelect, MetricCard, ModuleBody, ModuleHeader, ModuleShell, Panel, StatusBadge } from "@/components/dashboard/Primitives";
import { CompactAreaChart, ResourceBars } from "@/components/dashboard/Charts";

const platformIcons = [Globe2, Smartphone, PlugZap, Wifi];
const statusText: Record<string, string> = {
  healthy: "ổn định",
  warning: "cần xử lý",
  planned: "kế hoạch",
  ready: "sẵn sàng",
};

export function PlatformsConsole() {
  return (
    <ModuleShell>
      <ModuleHeader
        eyebrow="Nền tảng"
        title="Vận hành đa nền tảng"
        description="Tổng quan Web App, mobile concept, tích hợp API, mức sẵn sàng PWA và môi trường deploy."
        actions={
          <>
            <FilterSelect label="Môi trường" options={["Local", "Preview", "Production"]} />
            <FilterSelect label="Release" options={["Hiện tại", "Kế tiếp", "Lưu trữ"]} />
            <ActionButton><span className="inline-flex items-center gap-2"><Rocket className="h-3.5 w-3.5" /> Kiểm tra deploy</span></ActionButton>
          </>
        }
      />
      <ModuleBody>
        <div className="grid gap-3">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {platformCards.map((platform, index) => (
              <MetricCard
                key={platform.name}
                icon={platformIcons[index]}
                label={platform.name}
                value={statusText[platform.status] ?? platform.status}
                note={`${platform.version} - ${platform.environment}`}
                status={platform.status}
              />
            ))}
          </section>

          <section className="grid gap-3 xl:grid-cols-12">
            <Panel title="Sẵn sàng nền tảng" subtitle="Mức sẵn sàng theo kênh" className="xl:col-span-4">
              <ResourceBars data={platformCards.map((item) => ({ name: item.name, value: item.readiness }))} />
            </Panel>
            <Panel title="Sử dụng theo kênh" subtitle="Lưu lượng ưu tiên Web" className="xl:col-span-5">
              <CompactAreaChart data={usageTrend} xKey="day" areas={["chats", "users"]} height={240} />
            </Panel>
            <Panel title="Ghi chú release" subtitle="Mốc nền tảng gần đây" className="xl:col-span-3">
              <div className="grid gap-2">
                {releaseNotes.map((release) => (
                  <div key={release.version} className="rounded-lg border border-line bg-mist p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">{release.version}</span>
                      <span className="text-slate-500">{release.date}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{release.note}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-3 xl:grid-cols-[1fr_380px]">
            <Panel title="Luồng tích hợp" subtitle="Khối kiến trúc và sức khỏe">
              <div className="grid gap-2 lg:grid-cols-5">
                {integrationFlow.map((flow, index) => (
                  <div key={`${flow.from}-${flow.to}`} className="rounded-lg border border-line bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-mist text-teal">
                        {index === 0 ? <Globe2 className="h-4 w-4" /> : index === 1 ? <Boxes className="h-4 w-4" /> : index === 2 ? <PlugZap className="h-4 w-4" /> : index === 3 ? <GitBranch className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                      </span>
                      <StatusBadge status={flow.health} />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-ink">{flow.from}</p>
                    <p className="mt-1 text-xs text-slate-500">đến {flow.to}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Checklist deploy" subtitle="Mức sẵn sàng production">
              <div className="grid gap-2">
                {[
                  ["Gemini key chỉ ở server", "healthy"],
                  ["Không lộ secret ở client", "healthy"],
                  ["PWA manifest", "warning"],
                  ["Mobile shell", "planned"],
                  ["Kiểm thử tích hợp API", "warning"],
                  ["Xuất BI", "planned"],
                ].map(([item, status]) => (
                  <div key={item} className="flex items-center justify-between rounded-lg border border-line bg-mist px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{item}</span>
                    <StatusBadge status={status} />
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </div>
      </ModuleBody>
    </ModuleShell>
  );
}
