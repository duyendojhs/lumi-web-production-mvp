import fs from "node:fs";
import path from "node:path";
import { getAuthRuntimeStatus } from "@/lib/auth/provider";
import { demoCurrentRole, rbacMatrix } from "@/lib/auth/rbac";
import { getDatabaseStatus } from "@/lib/server/db/client";

export interface DataLayerBundle {
  dataRoot: string;
  generated: boolean;
  statistics: DataStatistics;
  catalog: DataCatalogRecord[];
  chunks: DataChunkRecord[];
  ingestionReport: Record<string, unknown>;
  processingReport: Record<string, unknown>;
  featureReport: Record<string, unknown>;
  qualityReportText: string;
  lineage: DataLineage;
  accessPolicy: Record<string, unknown>;
  dataDictionary: Record<string, unknown>;
  ocrQueue: OcrQueueReport;
  observability: ObservabilitySummary;
  issueTriage: IssueTriageReport;
  expectationContracts: ExpectationContracts;
  expectationResults: ExpectationResults;
  dataProducts: DataProductsReport;
  productionReadiness: ProductionReadiness;
}

export interface DataStatistics {
  created_at?: string;
  total_raw_files?: number;
  total_documents?: number;
  content_documents?: number;
  manifest_files?: number;
  system_files?: number;
  archive_files?: number;
  processable_documents?: number;
  processed_text_documents?: number;
  content_processed_text_documents?: number;
  total_chunks?: number;
  content_chunks?: number;
  file_type_distribution?: Record<string, number>;
  content_file_type_distribution?: Record<string, number>;
  category_distribution?: Record<string, number>;
  content_category_distribution?: Record<string, number>;
  source_domain_distribution?: Record<string, number>;
  text_length_distribution?: {
    min?: number;
    max?: number;
    avg?: number;
    median?: number;
    buckets?: Record<string, number>;
  };
  missing_summary?: Record<string, number>;
  outlier_summary?: Record<string, number>;
  pdf_needs_ocr_count?: number;
  issue_counts?: Record<string, number>;
  quality_score?: number;
  raw_quality_score?: number;
  content_readiness_score?: number;
  processing_readiness_score?: number;
  quality_breakdown?: QualityBreakdown;
  status_counts?: Record<string, number>;
  ai_readiness_score?: number;
  governance_score?: number;
  raw_integrity_score?: number;
  overall_data_health?: number;
}

export interface QualityBreakdown {
  ocr_penalty?: number;
  missing_values_penalty?: number;
  encoding_penalty?: number;
  short_body_penalty?: number;
  archive_system_file_penalty?: number;
  duplicate_penalty?: number;
  processing_coverage_penalty?: number;
  raw_quality_score?: number;
  content_readiness_score?: number;
  processing_readiness_score?: number;
  content_processing_coverage_percent?: number;
  recommended_fixes?: string[];
}

export interface DataCatalogRecord {
  document_id: string;
  title: string;
  file_name?: string;
  file_type: string;
  category: string;
  data_role?: string;
  is_content_document?: boolean;
  is_manifest_file?: boolean;
  is_system_file?: boolean;
  is_archive_file?: boolean;
  is_processable?: boolean;
  relative_path: string;
  local_path?: string;
  source_url?: string;
  source_domain?: string;
  language?: string;
  file_size_bytes?: number;
  checksum_sha256?: string;
  ingested_at?: string;
  is_public?: boolean;
  access_note?: string;
  ingestion_status?: string;
  issues?: string[];
  page_count?: number;
  text_sample_length?: number;
}

export interface DataChunkRecord {
  chunk_id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  title?: string;
  source_url?: string;
  category?: string;
  file_type?: string;
  data_role?: string;
  is_content_document?: boolean;
  char_count?: number;
  word_count?: number;
}

export interface DataLineage {
  generated_at?: string;
  dataset_name?: string;
  stages?: Array<Record<string, string | number | boolean>>;
}

export interface OcrQueueReport {
  created_at?: string;
  total_pdf_needing_ocr?: number;
  tesseract_available?: boolean;
  status?: string;
  suggested_command?: string;
  future_ocr_command?: string;
  items?: Array<Record<string, string | number | boolean>>;
}

export interface ObservabilitySummary {
  generated_at?: string;
  estimated_from_local_pipeline?: boolean;
  executive_summary?: Record<string, string | number | string[]>;
  quality_dimensions?: QualityDimension[];
  pipeline_runs?: Array<Record<string, string | number>>;
  category_status?: Array<Record<string, string | number>>;
  source_domain_cards?: Array<Record<string, string | number>>;
  score_cards?: Array<Record<string, string | number>>;
  improvement_actions?: Array<Record<string, string | number>>;
  chunk_length_histogram?: Array<Record<string, string | number>>;
  chunks_by_category?: Array<Record<string, string | number>>;
  lineage_impact?: Array<Record<string, string | number>>;
}

export interface QualityDimension {
  name: string;
  score: number;
  status: string;
  metric: string;
  issue_count: number;
  recommended_action: string;
  basis?: string;
}

export interface IssueTriageReport {
  generated_at?: string;
  issues?: IssueTriageItem[];
}

export interface IssueTriageItem {
  issue_type: string;
  severity: string;
  affected_records: number;
  root_cause: string;
  downstream_impact: string;
  suggested_fix: string;
  command: string;
  action_label: string;
}

export interface ExpectationContracts {
  generated_at?: string;
  suite_name?: string;
  expectations?: Array<Record<string, string | number>>;
}

export interface ExpectationResults {
  generated_at?: string;
  suite_name?: string;
  results?: ExpectationResult[];
}

export interface ExpectationResult {
  name: string;
  description: string;
  status: string;
  pass_rate: number;
  affected_rows: number;
  owner: string;
  last_validated: string;
}

export interface DataProductsReport {
  generated_at?: string;
  products?: DataProduct[];
}

export interface DataProduct {
  name: string;
  category: string;
  documents: number;
  chunks: number;
  quality_score: number;
  readiness: string;
  source_domains: string[];
  main_issues: string[];
  used_by: string[];
  owner: string;
  sla: string;
}

export interface ProductionReadiness {
  ocrBatch: Record<string, unknown>;
  ragIndex: Record<string, unknown>;
  connectors: Record<string, unknown>;
  latestSnapshot: Record<string, unknown>;
  storagePolicy: Record<string, unknown>;
  runHistory: Array<Record<string, unknown>>;
  rbac: {
    currentRole: string;
    matrix: Array<Record<string, unknown>>;
  };
  deployment: DeploymentReadiness;
}

export interface DeploymentReadiness {
  currentMode: "local_fallback" | "production_db";
  appEnv: string;
  vercel: boolean;
  geminiConfigured: boolean;
  databaseConfigured: boolean;
  authConfigured: boolean;
  storageConfigured: boolean;
  jobProvider: string;
  jobConfigured: boolean;
  vectorProvider: string;
  vectorConfigured: boolean;
  localFallbackAvailable: boolean;
  rows: Array<{
    label: string;
    status: "ready" | "missing" | "planned" | "local";
    detail: string;
  }>;
}

export interface DataLayerFilters {
  fileType?: string;
  category?: string;
  status?: string;
  issue?: string;
  includeSystem?: boolean;
  limit?: number;
  q?: string;
}

export function getDataLayerBundle(): DataLayerBundle {
  const dataRoot = getDataRoot();
  const statistics = readJson<DataStatistics>(path.join(dataRoot, "features", "statistics", "data_statistics.json"), {});
  const catalog = readJson<DataCatalogRecord[]>(path.join(dataRoot, "metadata", "data_catalog.json"), []);
  const chunks = readJsonl<DataChunkRecord>(path.join(dataRoot, "features", "chunks", "document_chunks.jsonl"));
  const ingestionReport = readJson<Record<string, unknown>>(path.join(dataRoot, "reports", "ingestion_report.json"), {});
  const processingReport = readJson<Record<string, unknown>>(path.join(dataRoot, "reports", "processing_report.json"), {});
  const featureReport = readJson<Record<string, unknown>>(path.join(dataRoot, "reports", "feature_report.json"), {});
  const qualityReportText = readText(path.join(dataRoot, "reports", "data_quality_report.md"));
  const lineage = readJson<DataLineage>(path.join(dataRoot, "metadata", "data_lineage.json"), {});
  const accessPolicy = readJson<Record<string, unknown>>(path.join(dataRoot, "metadata", "access_policy.json"), {});
  const dataDictionary = readJson<Record<string, unknown>>(path.join(dataRoot, "metadata", "data_dictionary.json"), {});
  const ocrQueue = readJson<OcrQueueReport>(path.join(dataRoot, "reports", "pdf_ocr_queue.json"), {});
  const observability = readJson<ObservabilitySummary>(path.join(dataRoot, "reports", "data_observability_summary.json"), {});
  const issueTriage = readJson<IssueTriageReport>(path.join(dataRoot, "reports", "issue_triage.json"), {});
  const expectationContracts = readJson<ExpectationContracts>(path.join(dataRoot, "metadata", "data_expectations.json"), {});
  const expectationResults = readJson<ExpectationResults>(path.join(dataRoot, "reports", "expectation_results.json"), {});
  const dataProducts = readJson<DataProductsReport>(path.join(dataRoot, "metadata", "data_products.json"), {});
  const productionReadiness = getProductionReadiness(dataRoot);

  return {
    dataRoot,
    generated: Object.keys(statistics).length > 0 || catalog.length > 0,
    statistics,
    catalog,
    chunks,
    ingestionReport,
    processingReport,
    featureReport,
    qualityReportText,
    lineage,
    accessPolicy,
    dataDictionary,
    ocrQueue,
    observability,
    issueTriage,
    expectationContracts,
    expectationResults,
    dataProducts,
    productionReadiness,
  };
}

export function getDataLayerSummary() {
  const bundle = getDataLayerBundle();
  const stats = bundle.statistics;
  return {
    dataRoot: bundle.dataRoot,
    generated: bundle.generated,
    createdAt: stats.created_at ?? "",
    totalRawFiles: stats.total_raw_files ?? bundle.catalog.length,
    totalDocuments: stats.total_documents ?? bundle.catalog.length,
    contentDocuments: stats.content_documents ?? contentRecords(bundle.catalog).length,
    manifestFiles: stats.manifest_files ?? roleCount(bundle.catalog, "manifest"),
    systemFiles: stats.system_files ?? roleCount(bundle.catalog, "system"),
    archiveFiles: stats.archive_files ?? roleCount(bundle.catalog, "archive"),
    processableDocuments: stats.processable_documents ?? 0,
    processedTextDocuments: stats.processed_text_documents ?? 0,
    contentProcessedTextDocuments: stats.content_processed_text_documents ?? 0,
    totalChunks: stats.total_chunks ?? bundle.chunks.length,
    contentChunks: stats.content_chunks ?? bundle.chunks.filter((chunk) => chunk.is_content_document).length,
    pdfCount: stats.file_type_distribution?.pdf ?? 0,
    htmlCount: stats.file_type_distribution?.html ?? 0,
    txtCount: stats.file_type_distribution?.txt ?? 0,
    jsonCount: stats.file_type_distribution?.json ?? 0,
    csvCount: stats.file_type_distribution?.csv ?? 0,
    xlsxCount: stats.file_type_distribution?.xlsx ?? 0,
    pdfNeedsOcrCount: stats.pdf_needs_ocr_count ?? 0,
    qualityScore: stats.quality_score ?? 0,
    rawQualityScore: stats.raw_quality_score ?? stats.quality_score ?? 0,
    contentReadinessScore: stats.content_readiness_score ?? stats.quality_score ?? 0,
    processingReadinessScore: stats.processing_readiness_score ?? stats.quality_score ?? 0,
    aiReadinessScore: stats.ai_readiness_score ?? 0,
    governanceScore: stats.governance_score ?? 0,
    rawIntegrityScore: stats.raw_integrity_score ?? 0,
    overallDataHealth: stats.overall_data_health ?? stats.content_readiness_score ?? 0,
    qualityBreakdown: stats.quality_breakdown ?? {},
    statusCounts: stats.status_counts ?? {},
    issueCounts: stats.issue_counts ?? {},
    fileTypeDistribution: stats.file_type_distribution ?? {},
    contentFileTypeDistribution: stats.content_file_type_distribution ?? {},
    categoryDistribution: stats.category_distribution ?? {},
    contentCategoryDistribution: stats.content_category_distribution ?? {},
    sourceDomainDistribution: stats.source_domain_distribution ?? {},
    textLengthDistribution: stats.text_length_distribution ?? {},
    missingSummary: stats.missing_summary ?? {},
    outlierSummary: stats.outlier_summary ?? {},
    ocrQueueCount: bundle.ocrQueue.total_pdf_needing_ocr ?? stats.pdf_needs_ocr_count ?? 0,
    productionReadiness: bundle.productionReadiness,
  };
}

export function getDataLayerCatalog(filters: DataLayerFilters = {}) {
  const bundle = getDataLayerBundle();
  const rows = filterCatalog(bundle.catalog, filters);
  const limit = normalizeLimit(filters.limit, 200);
  return {
    total: rows.length,
    returned: rows.slice(0, limit).length,
    rows: rows.slice(0, limit),
  };
}

export function getDataLayerQuality() {
  const bundle = getDataLayerBundle();
  return {
    summary: getDataLayerSummary(),
    processingReport: bundle.processingReport,
    ingestionReport: bundle.ingestionReport,
    qualityReportText: bundle.qualityReportText,
  };
}

export function getDataLayerChunks(filters: DataLayerFilters = {}) {
  const bundle = getDataLayerBundle();
  const query = normalizeQuery(filters.q);
  const limit = normalizeLimit(filters.limit, 80);
  let rows = bundle.chunks;
  if (filters.fileType && filters.fileType !== "all") rows = rows.filter((row) => row.file_type === filters.fileType);
  if (filters.category && filters.category !== "all") rows = rows.filter((row) => row.category === filters.category);
  if (!filters.includeSystem && !filters.fileType) rows = rows.filter((row) => row.is_content_document);
  if (query) {
    rows = rows.filter((row) => normalizeSearchText(`${row.title ?? ""} ${row.text} ${row.category ?? ""}`).includes(query));
  }
  return {
    total: rows.length,
    returned: rows.slice(0, limit).length,
    rows: rows.slice(0, limit),
  };
}

export function getDataLayerLineage() {
  const bundle = getDataLayerBundle();
  return {
    lineage: bundle.lineage,
    accessPolicy: bundle.accessPolicy,
    dataDictionary: bundle.dataDictionary,
  };
}

export function getDataLayerOcrQueue(limit = 50) {
  const bundle = getDataLayerBundle();
  const items = bundle.ocrQueue.items ?? [];
  return {
    ...bundle.ocrQueue,
    total_pdf_needing_ocr: bundle.ocrQueue.total_pdf_needing_ocr ?? items.length,
    returned: items.slice(0, limit).length,
    items: items.slice(0, limit),
  };
}

export function getDataLayerObservability() {
  const bundle = getDataLayerBundle();
  return {
    summary: getDataLayerSummary(),
    observability: bundle.observability,
  };
}

export function getDataLayerIssues() {
  return getDataLayerBundle().issueTriage;
}

export function getDataLayerExpectations() {
  const bundle = getDataLayerBundle();
  return {
    contracts: bundle.expectationContracts,
    results: bundle.expectationResults,
  };
}

export function getDataLayerProducts() {
  return getDataLayerBundle().dataProducts;
}

export function getDataLayerProductionReadiness() {
  return getDataLayerBundle().productionReadiness;
}

export function getDataLayerRunHistory(limit = 20) {
  const history = getProductionReadiness(getDataRoot()).runHistory;
  return {
    total: history.length,
    returned: history.slice(-limit).length,
    rows: history.slice(-limit).reverse(),
  };
}

export function searchRagIndex(q: string, limit = 8) {
  const dataRoot = getDataRoot();
  const rows = readJsonl<Record<string, unknown>>(path.join(dataRoot, "features", "rag_index", "chunks_for_rag.jsonl"));
  const query = normalizeQuery(q);
  if (!query) {
    return { q, total: 0, manifest: readJson<Record<string, unknown>>(path.join(dataRoot, "features", "rag_index", "rag_index_manifest.json"), {}), results: [] };
  }
  const terms = query.split(" ").filter((term) => term.length >= 3);
  const results = rows
    .map((row) => {
      const haystack = normalizeSearchText(`${row.title ?? ""} ${row.category ?? ""} ${row.text ?? ""} ${(row.keywords as string[] | undefined)?.join(" ") ?? ""}`);
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0) + countOccurrences(haystack, term), 0);
      return { row, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      score: item.score,
      chunkId: item.row.chunk_id,
      title: item.row.title,
      category: item.row.category,
      fileType: item.row.file_type,
      sourceUrl: item.row.source_url,
      preview: item.row.text_preview ?? String(item.row.text ?? "").slice(0, 500),
    }));
  return {
    q,
    total: results.length,
    manifest: readJson<Record<string, unknown>>(path.join(dataRoot, "features", "rag_index", "rag_index_manifest.json"), {}),
    results,
  };
}

export function searchDataLayer(q: string, limit = 20) {
  const bundle = getDataLayerBundle();
  const query = normalizeQuery(q);
  if (!query) {
    return { q, total: 0, results: [] };
  }
  const catalogMatches = bundle.catalog
    .filter((row) => row.is_content_document)
    .filter((row) => normalizeSearchText(`${row.title} ${row.relative_path} ${row.category} ${row.source_domain ?? ""}`).includes(query))
    .slice(0, limit)
    .map((row) => ({
      type: "document",
      id: row.document_id,
      title: row.title,
      category: row.category,
      fileType: row.file_type,
      sourceUrl: row.source_url,
      preview: row.relative_path,
    }));
  const chunkMatches = bundle.chunks
    .filter((row) => row.is_content_document)
    .filter((row) => normalizeSearchText(`${row.title ?? ""} ${row.text} ${row.category ?? ""}`).includes(query))
    .slice(0, limit)
    .map((row) => ({
      type: "chunk",
      id: row.chunk_id,
      title: row.title,
      category: row.category,
      fileType: row.file_type,
      sourceUrl: row.source_url,
      preview: row.text.slice(0, 500),
    }));
  const results = [...catalogMatches, ...chunkMatches].slice(0, limit);
  return { q, total: results.length, results };
}

export function parseFilters(searchParams: URLSearchParams): DataLayerFilters {
  const includeSystem = searchParams.get("includeSystem") === "true";
  const limitValue = Number(searchParams.get("limit") ?? "");
  return {
    fileType: emptyToUndefined(searchParams.get("fileType")),
    category: emptyToUndefined(searchParams.get("category")),
    status: emptyToUndefined(searchParams.get("status")),
    issue: emptyToUndefined(searchParams.get("issue")),
    includeSystem,
    q: emptyToUndefined(searchParams.get("q")),
    limit: Number.isFinite(limitValue) && limitValue > 0 ? limitValue : undefined,
  };
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}

function filterCatalog(rows: DataCatalogRecord[], filters: DataLayerFilters) {
  const query = normalizeQuery(filters.q);
  return rows.filter((row) => {
    if (!filters.includeSystem && !row.is_content_document) return false;
    if (filters.fileType && filters.fileType !== "all" && row.file_type !== filters.fileType) return false;
    if (filters.category && filters.category !== "all" && row.category !== filters.category) return false;
    if (filters.status && filters.status !== "all" && row.ingestion_status !== filters.status) return false;
    if (filters.issue && filters.issue !== "all" && !(row.issues ?? []).includes(filters.issue)) return false;
    if (query && !normalizeSearchText(`${row.title} ${row.relative_path} ${row.source_url ?? ""} ${row.category}`).includes(query)) return false;
    return true;
  });
}

function roleCount(rows: DataCatalogRecord[], role: string) {
  return rows.filter((row) => row.data_role === role).length;
}

function getProductionReadiness(dataRoot: string): ProductionReadiness {
  return {
    ocrBatch: readJson<Record<string, unknown>>(path.join(dataRoot, "reports", "ocr_batch_report.json"), {}),
    ragIndex: readJson<Record<string, unknown>>(path.join(dataRoot, "features", "rag_index", "rag_index_manifest.json"), {}),
    connectors: readJson<Record<string, unknown>>(path.join(dataRoot, "metadata", "ingestion_connectors.json"), {}),
    latestSnapshot: readJson<Record<string, unknown>>(path.join(dataRoot, "metadata", "snapshots", "latest_snapshot.json"), {}),
    storagePolicy: readJson<Record<string, unknown>>(path.join(dataRoot, "metadata", "storage_policy.json"), {}),
    runHistory: readJsonl<Record<string, unknown>>(path.join(dataRoot, "reports", "pipeline_run_history.jsonl")),
    rbac: {
      currentRole: demoCurrentRole,
      matrix: rbacMatrix(),
    },
    deployment: getRuntimeDeploymentReadiness(dataRoot),
  };
}

export function getRuntimeDeploymentReadiness(dataRoot = getDataRoot()): DeploymentReadiness {
  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  const database = getDatabaseStatus();
  const storage = getStorageRuntimeStatus();
  const auth = getAuthRuntimeStatus();
  const jobProvider = process.env.JOB_PROVIDER ?? "manual";
  const vectorProvider = process.env.VECTOR_PROVIDER ?? "pgvector";
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const jobConfigured = jobProvider === "manual" || Boolean(process.env.QSTASH_TOKEN || (process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY));
  const vectorConfigured =
    vectorProvider === "pgvector"
      ? database.configured
      : vectorProvider === "qdrant"
        ? Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY)
        : false;
  const currentMode = appEnv === "production" && database.configured ? "production_db" : "local_fallback";
  const localFallbackAvailable = fs.existsSync(dataRoot);
  return {
    currentMode,
    appEnv,
    vercel: Boolean(process.env.VERCEL),
    geminiConfigured,
    databaseConfigured: database.configured,
    authConfigured: auth.configured,
    storageConfigured: storage.configured,
    jobProvider,
    jobConfigured,
    vectorProvider,
    vectorConfigured,
    localFallbackAvailable,
    rows: [
      { label: "Vercel web/API", status: process.env.VERCEL ? "ready" : "planned", detail: process.env.VERCEL ? "running on Vercel" : "ready to deploy to Vercel" },
      { label: "Gemini API", status: geminiConfigured ? "ready" : "missing", detail: geminiConfigured ? "server env configured" : "set GEMINI_API_KEY" },
      { label: "Managed Postgres", status: database.configured ? "ready" : "missing", detail: database.message },
      { label: "Production auth", status: auth.configured ? "ready" : "missing", detail: auth.message },
      { label: "Object storage", status: storage.provider === "local" ? "local" : storage.configured ? "ready" : "missing", detail: storage.message },
      { label: "Jobs/workers", status: jobConfigured ? "ready" : "planned", detail: jobProvider === "manual" ? "manual/local jobs configured" : `${jobProvider} env configured` },
      { label: "Vector search", status: vectorConfigured ? "ready" : "planned", detail: vectorProvider === "pgvector" ? "requires DATABASE_URL + vector schema" : "requires vector provider env" },
      { label: "Local fallback", status: localFallbackAvailable ? "local" : "missing", detail: localFallbackAvailable ? "local artifacts available for dev" : "no local data artifacts detected" },
    ],
  };
}

function getStorageRuntimeStatus() {
  const provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();
  if (provider === "supabase") {
    const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.STORAGE_BUCKET);
    return { provider, configured, message: configured ? "Supabase Storage configured" : "Missing Supabase URL/service role/bucket" };
  }
  if (provider === "s3" || provider === "r2") {
    const configured = Boolean(process.env.S3_ENDPOINT && process.env.S3_REGION && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET);
    return { provider, configured, message: configured ? "S3/R2 storage configured" : "Missing S3/R2 endpoint, region, keys, or bucket" };
  }
  return { provider: "local", configured: true, message: "Local storage driver is for development only" };
}

function contentRecords(rows: DataCatalogRecord[]) {
  return rows.filter((row) => row.is_content_document || ["pdf", "html", "txt"].includes(row.file_type));
}

function normalizeLimit(value: number | undefined, fallback: number) {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(value, 1000));
}

function normalizeQuery(value: string | undefined) {
  return normalizeSearchText(value ?? "");
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function countOccurrences(value: string, needle: string) {
  if (!needle) return 0;
  return value.split(needle).length - 1;
}

function emptyToUndefined(value: string | null) {
  if (!value || value === "all") return undefined;
  return value;
}

export function getDataRoot() {
  if (process.env.DATA_ROOT) {
    return path.resolve(process.env.DATA_ROOT);
  }
  const fromWebApp = path.resolve(process.cwd(), "../../data");
  if (fs.existsSync(fromWebApp)) {
    return fromWebApp;
  }
  return path.resolve(process.cwd(), "data");
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function readJsonl<T>(filePath: string): T[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

function readText(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}
