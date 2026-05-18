import {
  getDataLayerBundle as getLocalDataLayerBundle,
  getDataLayerCatalog as getLocalCatalog,
  getDataLayerChunks as getLocalChunks,
  getDataLayerExpectations as getLocalExpectations,
  getDataLayerIssues as getLocalIssues,
  getDataLayerLineage as getLocalLineage,
  getDataLayerObservability as getLocalObservability,
  getDataLayerOcrQueue as getLocalOcrQueue,
  getDataLayerProducts as getLocalProducts,
  getDataLayerProductionReadiness as getLocalProductionReadiness,
  getDataLayerQuality as getLocalQuality,
  getDataLayerRunHistory as getLocalRunHistory,
  getDataLayerSummary as getLocalSummary,
  getRuntimeDeploymentReadiness,
  parseFilters,
  searchDataLayer as searchLocalDataLayer,
  searchRagIndex as searchLocalRagIndex,
  type DataLayerBundle,
  type DataLayerFilters,
  type ProductionReadiness,
} from "./dataLayerOutputs";
import { getDatabaseStatus, productionDbUnavailablePayload, shouldUseProductionDb } from "./db/client";
import { listDatasetVersionsFromDb } from "./db/datasetVersions";
import { listDocumentsFromDb } from "./db/documents";
import { listPipelineRunsFromDb } from "./db/pipelineRuns";
import { listQualityIssuesFromDb } from "./db/qualityIssues";

export { parseFilters };

export function getDataLayerBundle(): DataLayerBundle {
  if (!shouldUseProductionDb()) return getLocalDataLayerBundle();
  return emptyProductionBundle();
}

export function getDataLayerSummary() {
  if (!shouldUseProductionDb()) return getLocalSummary();
  const status = productionDbUnavailablePayload();
  return {
    ...status,
    generated: false,
    source: "managed_postgres",
    totalRawFiles: 0,
    totalDocuments: 0,
    contentDocuments: 0,
    processedTextDocuments: 0,
    totalChunks: 0,
    overallDataHealth: 0,
    productionReadiness: getProductionReadinessForRuntime(),
  };
}

export function getDataLayerCatalog(filters: DataLayerFilters = {}) {
  if (!shouldUseProductionDb()) return getLocalCatalog(filters);
  const documents = listDocumentsFromDb();
  return {
    ...productionDbUnavailablePayload(),
    total: documents.data.length,
    returned: documents.data.length,
    rows: documents.data,
  };
}

export function getDataLayerQuality() {
  if (!shouldUseProductionDb()) return getLocalQuality();
  const issues = listQualityIssuesFromDb();
  return {
    ...productionDbUnavailablePayload(),
    issues: issues.data,
    summary: getDataLayerSummary(),
  };
}

export function getDataLayerChunks(filters: DataLayerFilters = {}) {
  if (!shouldUseProductionDb()) return getLocalChunks(filters);
  return {
    ...productionDbUnavailablePayload(),
    total: 0,
    returned: 0,
    rows: [],
  };
}

export function getDataLayerLineage() {
  if (!shouldUseProductionDb()) return getLocalLineage();
  return {
    ...productionDbUnavailablePayload(),
    lineage: {},
    accessPolicy: {},
    dataDictionary: {},
  };
}

export function getDataLayerOcrQueue(limit = 50) {
  if (!shouldUseProductionDb()) return getLocalOcrQueue(limit);
  return {
    ...productionDbUnavailablePayload(),
    total_pdf_needing_ocr: 0,
    returned: 0,
    items: [],
  };
}

export function getDataLayerObservability() {
  if (!shouldUseProductionDb()) return getLocalObservability();
  return {
    ...productionDbUnavailablePayload(),
    summary: getDataLayerSummary(),
    observability: {},
  };
}

export function getDataLayerIssues() {
  if (!shouldUseProductionDb()) return getLocalIssues();
  const issues = listQualityIssuesFromDb();
  return {
    ...productionDbUnavailablePayload(),
    issues: issues.data,
  };
}

export function getDataLayerExpectations() {
  if (!shouldUseProductionDb()) return getLocalExpectations();
  return {
    ...productionDbUnavailablePayload(),
    contracts: {},
    results: {},
  };
}

export function getDataLayerProducts() {
  if (!shouldUseProductionDb()) return getLocalProducts();
  return {
    ...productionDbUnavailablePayload(),
    products: [],
  };
}

export function getDataLayerProductionReadiness(): ProductionReadiness {
  if (!shouldUseProductionDb()) return getLocalProductionReadiness();
  return getProductionReadinessForRuntime();
}

export function getDataLayerRunHistory(limit = 20) {
  if (!shouldUseProductionDb()) return getLocalRunHistory(limit);
  const rows = listPipelineRunsFromDb().data.slice(0, limit);
  return {
    ...productionDbUnavailablePayload(),
    total: rows.length,
    returned: rows.length,
    rows,
  };
}

export function searchRagIndex(q: string, limit = 8) {
  if (!shouldUseProductionDb()) return searchLocalRagIndex(q, limit);
  return {
    ...productionDbUnavailablePayload(),
    q,
    total: 0,
    results: [],
    productionPath: "Use pgvector document_chunks.embedding or keyword fallback. See README.md for deployment setup.",
  };
}

export function searchDataLayer(q: string, limit = 20) {
  if (!shouldUseProductionDb()) return searchLocalDataLayer(q, limit);
  return {
    ...productionDbUnavailablePayload(),
    q,
    total: 0,
    results: [],
  };
}

function getProductionReadinessForRuntime(): ProductionReadiness {
  return {
    ocrBatch: {},
    ragIndex: {},
    connectors: {},
    latestSnapshot: firstDatasetVersionSnapshot(),
    storagePolicy: {},
    runHistory: listPipelineRunsFromDb().data as unknown as Array<Record<string, unknown>>,
    rbac: {
      currentRole: "user",
      matrix: [],
    },
    deployment: getRuntimeDeploymentReadiness(""),
  };
}

function firstDatasetVersionSnapshot() {
  const versions = listDatasetVersionsFromDb().data;
  return versions[0] ? { version: versions[0].version, created_at: versions[0].created_at } : {};
}

function emptyProductionBundle(): DataLayerBundle {
  const database = getDatabaseStatus();
  return {
    dataRoot: "managed-postgres/object-storage",
    generated: false,
    statistics: {
      created_at: new Date().toISOString(),
      overall_data_health: 0,
    },
    catalog: [],
    chunks: [],
    ingestionReport: { mode: "production_db", database },
    processingReport: {},
    featureReport: {},
    qualityReportText: "Production mode expects Data Layer records in managed Postgres and object storage.",
    lineage: {},
    accessPolicy: {},
    dataDictionary: {},
    ocrQueue: {},
    observability: {},
    issueTriage: { issues: [] },
    expectationContracts: {},
    expectationResults: {},
    dataProducts: { products: [] },
    productionReadiness: getProductionReadinessForRuntime(),
  };
}
