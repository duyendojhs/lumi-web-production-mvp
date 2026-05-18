"use client";

import { Boxes, Search, Sparkles } from "lucide-react";
import type { DataProductsReport } from "@/lib/server/dataLayerOutputs";
import { Panel, StatusBadge } from "@/components/dashboard/Primitives";

export function DataProductCards({ products, compact = false }: Readonly<{ products: DataProductsReport; compact?: boolean }>) {
  const rows = products.products ?? [];
  return (
    <Panel title="Data products" subtitle="Business-facing curated slices used by AI, BI and search">
      <div className={`grid gap-3 ${compact ? "xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-5"}`}>
        {rows.map((item) => (
          <article key={item.name} className="min-h-[214px] rounded-lg border border-line bg-mist p-3 transition-colors hover:bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-teal"><Boxes className="h-4 w-4" /></span>
              <StatusBadge status={item.readiness} />
            </div>
            <h3 className="mt-3 min-h-[40px] text-sm font-semibold leading-5 text-ink" title={item.name}>{item.name}</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Mini label="Docs" value={item.documents} />
              <Mini label="Chunks" value={item.chunks} />
              <Mini label="Score" value={item.quality_score} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.used_by.map((used) => (
                <span key={used} className="inline-flex min-w-[78px] items-center justify-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600" title={used}>
                  {used.includes("AI") ? <Sparkles className="h-3 w-3" /> : <Search className="h-3 w-3" />}
                  {used}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs leading-4 text-slate-500" title={item.source_domains.join(", ") || "local"}>{item.source_domains.join(", ") || "local"}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Mini({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="rounded-lg bg-white px-2 py-1.5">
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
