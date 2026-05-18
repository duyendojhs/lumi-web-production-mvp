"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Workflow } from "lucide-react";
import type {
  DataCatalogRecord,
  DataChunkRecord,
  DataLineage,
  DataProductsReport,
  DataStatistics,
  ExpectationContracts,
  ExpectationResults,
  IssueTriageReport,
  ObservabilitySummary,
  OcrQueueReport,
  ProductionReadiness,
} from "@/lib/server/dataLayerOutputs";
import { ActionButton, ModuleBody, ModuleHeader, ModuleShell, Panel } from "@/components/dashboard/Primitives";
import { DataCatalogTable } from "@/components/data-layer/DataCatalogTable";
import { DataContractsPanel } from "@/components/data-layer/DataContractsPanel";
import { DataLayerOverview } from "@/components/data-layer/DataLayerOverview";
import { DataProductCards } from "@/components/data-layer/DataProductCards";
import { FeatureExplorer } from "@/components/data-layer/FeatureExplorer";
import { GovernanceTabs } from "@/components/data-layer/GovernanceTabs";
import { IssueTriagePanel } from "@/components/data-layer/IssueTriagePanel";
import { QualityDimensions } from "@/components/data-layer/QualityDimensions";

interface DataLayerConsoleProps {
  statistics: DataStatistics;
  catalog: DataCatalogRecord[];
  chunks: DataChunkRecord[];
  dataRoot: string;
  generated: boolean;
  lineage: DataLineage;
  ocrQueue: OcrQueueReport;
  observability: ObservabilitySummary;
  issueTriage: IssueTriageReport;
  expectationContracts: ExpectationContracts;
  expectationResults: ExpectationResults;
  dataProducts: DataProductsReport;
  productionReadiness: ProductionReadiness;
  accessPolicy: Record<string, unknown>;
  dataDictionary: Record<string, unknown>;
}

const tabs = ["Overview", "Quality", "Catalog", "Features", "Governance"];
const tabLabels: Record<string, string> = {
  Overview: "Tổng quan",
  Quality: "Chất lượng",
  Catalog: "Catalog",
  Features: "Đặc trưng",
  Governance: "Quản trị",
};
const tabBySlug = Object.fromEntries(tabs.map((tab) => [slugify(tab), tab]));

export function DataLayerConsole({
  statistics,
  catalog,
  chunks,
  dataRoot,
  generated,
  lineage,
  ocrQueue,
  observability,
  issueTriage,
  expectationContracts,
  expectationResults,
  dataProducts,
  productionReadiness,
  accessPolicy,
  dataDictionary,
}: Readonly<DataLayerConsoleProps>) {
  const [active, setActive] = useState("Overview");
  const lastGenerated = statistics.created_at ? new Date(statistics.created_at).toLocaleString("vi-VN") : "chưa tạo";
  const activeDescription = useMemo(() => {
    if (active === "Quality") return "Điểm chất lượng, triage issue, OCR và data contracts.";
    if (active === "Catalog") return "Catalog có lọc, sắp xếp và chi tiết từng tài liệu.";
    if (active === "Features") return "Chunks, coverage và preview nội dung cho AI/search.";
    if (active === "Governance") return "Lineage, từ điển dữ liệu, quyền truy cập, phiên bản và tích hợp.";
    return "Tóm tắt điều hành, lineage, KPI và biểu đồ observability chính.";
  }, [active]);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const next = tabBySlug[params.get("tab") ?? ""] ?? "Overview";
      setActive(next);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const selectTab = (tab: string) => {
    setActive(tab);
    const url = new URL(window.location.href);
    if (tab === "Overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", slugify(tab));
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <ModuleShell>
      <ModuleHeader
        eyebrow="Phân hệ 01 - Trung tâm dữ liệu"
        title="Quan sát lớp dữ liệu"
        description="Bảng vận hành cho dữ liệu gốc, processed text, features, chất lượng, lineage, contracts, data products và governance."
        actions={
          <>
            <span className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-600">Lần chạy: {lastGenerated}</span>
            <button onClick={() => window.location.reload()} className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-mist">
              <span className="inline-flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5" /> Tải lại</span>
            </button>
            <ActionButton><span className="inline-flex items-center gap-2"><Workflow className="h-3.5 w-3.5" /> run_data_layer.py</span></ActionButton>
          </>
        }
      />
      <ModuleBody>
        {!generated ? (
          <Panel title="Thiếu output pipeline" subtitle={dataRoot}>
            <p className="text-sm text-slate-600">Chưa tìm thấy output Data Layer. Trong production, hãy nạp tài liệu vào Postgres, Storage và pgvector trước khi mở dashboard dữ liệu.</p>
          </Panel>
        ) : (
          <div className="grid gap-3">
            <div className="sticky top-0 z-20 flex flex-wrap gap-2 rounded-lg border border-line bg-white/95 p-2 shadow-panel backdrop-blur">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => selectTab(tab)}
                  aria-pressed={active === tab}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${active === tab ? "bg-teal text-white shadow-sm" : "text-slate-700 hover:bg-mist"
                    }`}
                >
                  {tabLabels[tab] ?? tab}
                </button>
              ))}
              <span className="ml-auto hidden items-center rounded-lg bg-mist px-3 py-2 text-xs font-medium text-slate-600 xl:flex">
                {activeDescription}
              </span>
            </div>

            {active === "Overview" ? (
              <DataLayerOverview statistics={statistics} observability={observability} lineage={lineage} ocrQueue={ocrQueue} products={dataProducts} productionReadiness={productionReadiness} />
            ) : null}

            {active === "Quality" ? (
              <div className="grid gap-3">
                <QualityDimensions observability={observability} />
                <IssueTriagePanel issueTriage={issueTriage} productionReadiness={productionReadiness} />
                <DataContractsPanel contracts={expectationContracts} results={expectationResults} />
              </div>
            ) : null}

            {active === "Catalog" ? <DataCatalogTable catalog={catalog} chunks={chunks} /> : null}

            {active === "Features" ? (
              <FeatureExplorer
                catalog={catalog}
                chunks={chunks}
                histogram={observability.chunk_length_histogram}
                chunksByCategory={observability.chunks_by_category}
                productionReadiness={productionReadiness}
              />
            ) : null}

            {active === "Governance" ? (
              <div className="grid gap-3">
                <GovernanceTabs lineage={lineage} accessPolicy={accessPolicy} dataDictionary={dataDictionary} productionReadiness={productionReadiness} />
                <DataProductCards products={dataProducts} />
              </div>
            ) : null}
          </div>
        )}
      </ModuleBody>
    </ModuleShell>
  );
}

function slugify(tab: string) {
  return tab.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
