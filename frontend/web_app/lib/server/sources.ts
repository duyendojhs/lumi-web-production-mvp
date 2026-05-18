import { getDataLayerBundle } from "@/lib/server/dataLayerOutputs";
import { queryDb, shouldUseProductionDb } from "@/lib/server/db/client";

export interface SourceLibraryFilters {
  q?: string;
  fileType?: string;
  category?: string;
  limit?: number;
}

export interface SourceLibraryItem {
  id: string;
  kind: "document" | "chunk";
  title: string;
  category?: string | null;
  fileType?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null;
  snippet: string;
  freshness?: string | null;
  documentId?: string | null;
  chunkId?: string | null;
  chunkIndex?: number | null;
}

interface SourceDbRow {
  chunk_id?: string | null;
  document_id?: string | null;
  chunk_index?: number | null;
  text?: string | null;
  title?: string | null;
  category?: string | null;
  source_url?: string | null;
  source_domain?: string | null;
  file_type?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 200;
const PRIVATE_PATTERN = /gmail|calendar|email|inbox|oauth|token|credential|secret|memory|personal|tasks?|meeting|schedule/i;

export async function getSourceLibrary(filters: SourceLibraryFilters = {}) {
  const limit = normalizeLimit(filters.limit);
  const result = shouldUseProductionDb()
    ? await getSourcesFromDb(filters, limit).catch(() => getSourcesFromLocal(filters, limit))
    : getSourcesFromLocal(filters, limit);

  return {
    ...result,
    filters: {
      categories: uniqueSorted(result.items.map((item) => item.category).filter(Boolean).map(String)),
      fileTypes: uniqueSorted(result.items.map((item) => item.fileType).filter(Boolean).map(String)),
    },
  };
}

async function getSourcesFromDb(filters: SourceLibraryFilters, limit: number) {
  const q = normalizeSearchText(filters.q ?? "");
  const rows = await queryDb<SourceDbRow>(
    `
      select
        c.id::text as chunk_id,
        c.document_id::text as document_id,
        c.chunk_index,
        c.text,
        d.title,
        d.category,
        coalesce(f.source_url, d.source_url) as source_url,
        d.source_domain,
        f.file_type,
        coalesce(c.updated_at, c.created_at, d.updated_at, d.created_at)::text as updated_at
      from document_chunks c
      join documents d on d.id = c.document_id
      left join lateral (
        select file_type, source_url
        from document_files
        where document_id = d.id
        order by created_at desc
        limit 1
      ) f on true
      where d.is_public = true
      order by coalesce(c.updated_at, c.created_at, d.updated_at, d.created_at) desc nulls last, c.chunk_index asc
      limit $1
    `,
    [Math.min(limit * 4, 500)],
  );

  const items = rows
    .map((row, index) => toItemFromDb(row, index))
    .filter((item) => matchesFilters(item, filters, q));

  return {
    mode: "production_db" as const,
    total: items.length,
    items: items.slice(0, limit),
  };
}

function getSourcesFromLocal(filters: SourceLibraryFilters, limit: number) {
  const bundle = getDataLayerBundle();
  const q = normalizeSearchText(filters.q ?? "");
  const catalogByDocumentId = new Map(bundle.catalog.map((row) => [row.document_id, row]));
  const items = bundle.chunks
    .filter((chunk) => chunk.is_content_document !== false)
    .map((chunk, index): SourceLibraryItem => {
      const doc = catalogByDocumentId.get(chunk.document_id);
      return {
        id: chunk.chunk_id || `${chunk.document_id}-${chunk.chunk_index ?? index}`,
        kind: "chunk",
        title: chunk.title || doc?.title || `Nguồn ${index + 1}`,
        category: chunk.category || doc?.category || null,
        fileType: chunk.file_type || doc?.file_type || null,
        sourceUrl: chunk.source_url || doc?.source_url || null,
        sourceDomain: doc?.source_domain || null,
        snippet: compactSnippet(chunk.text || doc?.relative_path || ""),
        freshness: doc?.ingested_at || bundle.statistics.created_at || null,
        documentId: chunk.document_id,
        chunkId: chunk.chunk_id,
        chunkIndex: chunk.chunk_index,
      };
    })
    .filter((item) => matchesFilters(item, filters, q));

  return {
    mode: "local_fallback" as const,
    total: items.length,
    items: items.slice(0, limit),
  };
}

function toItemFromDb(row: SourceDbRow, index: number): SourceLibraryItem {
  return {
    id: row.chunk_id || row.document_id || `source-${index}`,
    kind: row.chunk_id ? "chunk" : "document",
    title: row.title || `Nguồn ${index + 1}`,
    category: row.category || null,
    fileType: row.file_type || null,
    sourceUrl: row.source_url || null,
    sourceDomain: row.source_domain || null,
    snippet: compactSnippet(row.text || ""),
    freshness: row.updated_at || row.created_at || null,
    documentId: row.document_id || null,
    chunkId: row.chunk_id || null,
    chunkIndex: row.chunk_index ?? null,
  };
}

function matchesFilters(item: SourceLibraryItem, filters: SourceLibraryFilters, normalizedQuery: string) {
  const privateHaystack = `${item.title} ${item.category ?? ""} ${item.fileType ?? ""} ${item.sourceUrl ?? ""} ${item.sourceDomain ?? ""}`;
  if (PRIVATE_PATTERN.test(privateHaystack)) return false;
  if (filters.fileType && filters.fileType !== "all" && item.fileType !== filters.fileType) return false;
  if (filters.category && filters.category !== "all" && item.category !== filters.category) return false;
  if (!normalizedQuery) return true;
  return normalizeSearchText(`${item.title} ${item.category ?? ""} ${item.fileType ?? ""} ${item.sourceDomain ?? ""} ${item.snippet}`).includes(normalizedQuery);
}

function compactSnippet(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 560);
}

function normalizeLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(Math.floor(value), MAX_LIMIT));
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "vi"));
}
