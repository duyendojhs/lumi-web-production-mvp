export interface DatabaseStatus {
  configured: boolean;
  mode: "local_fallback" | "production_db";
  adapter: "not_configured" | "postgres";
  message: string;
}

export interface RepositoryResult<T> {
  mode: "local_fallback" | "production_db";
  configured: boolean;
  warning?: string;
  data: T;
}

export interface DbDocumentRow {
  id: string;
  title: string;
  category: string;
  source_url?: string;
  source_domain?: string;
  processing_status?: string;
  quality_status?: string;
  metadata?: Record<string, unknown>;
}

export interface DbDocumentChunkRow {
  chunk_id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  metadata?: Record<string, unknown>;
  title: string;
  category?: string;
  source_url?: string | null;
  source_domain?: string | null;
  quality_status?: string;
  file_type?: string | null;
  original_file_name?: string | null;
  score?: number;
}

export interface DbPipelineRunRow {
  run_id: string;
  status: string;
  started_at: string;
  finished_at?: string;
  duration_sec?: number;
  raw_files?: number;
  content_docs?: number;
  processed_docs?: number;
  chunks?: number;
  issues_count?: number;
  ocr_queue_count?: number;
  overall_health?: number;
}

export interface DbQualityIssueRow {
  id: string;
  issue_type: string;
  severity: string;
  affected_records: number;
  status: string;
  suggested_fix?: string;
}

export interface DbDatasetVersionRow {
  id: string;
  dataset_name: string;
  version: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}
