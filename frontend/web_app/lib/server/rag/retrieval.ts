import { getDataLayerBundle, searchRagIndex as searchLocalRagIndex } from "@/lib/server/dataLayerOutputs";
import { queryDb, shouldUseProductionDb } from "@/lib/server/db/client";
import type { DbDocumentChunkRow } from "@/lib/server/db/types";

export type RagRetrievalMode = "pgvector" | "keyword" | "local_keyword";
export type RagContextStatus = "ready" | "weak" | "insufficient_data";

export interface RagCitation {
  citationIndex: number;
  chunkId: string;
  documentId: string;
  chunkIndex?: number;
  title: string;
  category?: string | null;
  fileType?: string | null;
  documentType?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null;
  score: number;
  preview: string;
  text?: string;
}

export interface RagSourceCard {
  citationIndex: number;
  title: string;
  sourceUrl?: string | null;
  sourceDomain?: string | null;
  category?: string | null;
  fileType?: string | null;
  score: number;
  preview: string;
  chunkId: string;
  documentId: string;
}

export interface RagRetrievalResult {
  q: string;
  status: RagContextStatus;
  retrievalMode: RagRetrievalMode;
  total: number;
  citations: RagCitation[];
  sourceCards: RagSourceCard[];
  contextText: string;
  latencyMs: number;
  warning?: string;
}

interface RetrieveOptions {
  limit?: number;
  userId?: string | null;
  officialOnly?: boolean;
}

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
  error?: {
    message?: string;
  };
}

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 10;

export async function retrieveRagContext(query: string, options: RetrieveOptions = {}): Promise<RagRetrievalResult> {
  const q = query.trim();
  const startedAt = Date.now();
  const limit = normalizeLimit(options.limit);

  if (q.length < 3) {
    return buildResult(q, "local_keyword", [], startedAt, "Câu hỏi quá ngắn để truy xuất nguồn.");
  }

  let result: RagRetrievalResult;
  if (shouldUseProductionDb()) {
    result = await retrieveFromProductionDb(q, limit, startedAt);
  } else {
    result = retrieveFromLocalArtifacts(q, limit, startedAt);
  }

  await logRagSearch(q, result, options).catch(() => undefined);
  return result;
}

export function toPublicRagPayload(result: RagRetrievalResult) {
  return {
    q: result.q,
    status: result.status,
    retrievalMode: result.retrievalMode,
    total: result.total,
    citations: result.citations.map(({ text, ...citation }) => citation),
    sourceCards: result.sourceCards,
    latencyMs: result.latencyMs,
    warning: result.warning,
  };
}

function retrieveFromLocalArtifacts(q: string, limit: number, startedAt: number): RagRetrievalResult {
  const local = searchLocalRagIndex(q, Math.max(limit * 4, 20));
  const bundle = getDataLayerBundle();
  const chunksById = new Map(bundle.chunks.map((chunk) => [chunk.chunk_id, chunk]));
  const results = local.results ?? [];
  const terms = keywordTerms(q);

  const citations = results.map((item, index) => {
    const chunkId = String(item.chunkId ?? "");
    const chunk = chunksById.get(chunkId);
    return normalizeCitation(
      {
        chunk_id: chunkId,
        document_id: String(chunk?.document_id ?? ""),
        chunk_index: chunk?.chunk_index ?? index,
        text: chunk?.text ?? String(item.preview ?? ""),
        title: String(item.title ?? chunk?.title ?? `Nguồn ${index + 1}`),
        category: String(item.category ?? chunk?.category ?? ""),
        source_url: String(item.sourceUrl ?? chunk?.source_url ?? ""),
        source_domain: "",
        quality_status: "local",
        file_type: String(item.fileType ?? chunk?.file_type ?? ""),
        original_file_name: null,
        score: Number(item.score ?? 0),
      },
      index,
    );
  })
    .filter((citation) => hasKeywordOverlap(citation, terms))
    .slice(0, limit);

  return buildResult(q, "local_keyword", citations, startedAt);
}

async function retrieveFromProductionDb(q: string, limit: number, startedAt: number): Promise<RagRetrievalResult> {
  const embedding = await embedQueryWithGemini(q).catch(() => null);
  if (embedding?.length) {
    const vectorRows = await searchByVector(embedding, limit).catch(() => []);
    if (vectorRows.length > 0) {
      const vectorResult = buildResult(q, "pgvector", vectorRows.map(normalizeCitation), startedAt);
      if (vectorResult.status === "ready") return vectorResult;
    }
  }

  const keywordRows = await searchByKeyword(q, limit).catch(async () => searchByKeywordPortable(q, limit));
  const warning = embedding?.length ? undefined : "Không tạo được query embedding; dùng keyword fallback.";
  return buildResult(q, "keyword", keywordRows.map(normalizeCitation), startedAt, warning);
}

async function searchByVector(embedding: number[], limit: number): Promise<DbDocumentChunkRow[]> {
  const vectorLiteral = `[${embedding.map((value) => Number(value).toFixed(8)).join(",")}]`;
  return queryDb<DbDocumentChunkRow>(
    `
      select
        c.id::text as chunk_id,
        c.document_id::text as document_id,
        c.chunk_index,
        c.text,
        c.metadata,
        d.title,
        d.category,
        coalesce(f.source_url, d.source_url) as source_url,
        d.source_domain,
        d.quality_status,
        f.file_type,
        f.original_file_name,
        (1 - (c.embedding <=> $1::vector))::float as score
      from document_chunks c
      join documents d on d.id = c.document_id
      left join lateral (
        select file_type, original_file_name, source_url
        from document_files
        where document_id = d.id
        order by created_at desc
        limit 1
      ) f on true
      where d.is_public = true
        and c.embedding is not null
      order by c.embedding <=> $1::vector
      limit $2
    `,
    [vectorLiteral, limit],
  );
}

async function searchByKeyword(q: string, limit: number): Promise<DbDocumentChunkRow[]> {
  const terms = keywordTerms(q);
  return queryDb<DbDocumentChunkRow>(
    `
      with prepared as (
        select
          c.id::text as chunk_id,
          c.document_id::text as document_id,
          c.chunk_index,
          c.text,
          c.metadata,
          c.created_at,
          d.title,
          d.category,
          coalesce(f.source_url, d.source_url) as source_url,
          d.source_domain,
          d.quality_status,
          f.file_type,
          f.original_file_name,
          lower(unaccent(coalesce(d.title, '') || ' ' || coalesce(array_to_string(d.tags, ' '), '') || ' ' || c.text)) as haystack
        from document_chunks c
        join documents d on d.id = c.document_id
        left join lateral (
          select file_type, original_file_name, source_url
          from document_files
          where document_id = d.id
          order by created_at desc
          limit 1
        ) f on true
        where d.is_public = true
      ),
      scored as (
        select
          *,
          (
            case
              when to_tsvector('simple', haystack) @@ plainto_tsquery('simple', $1)
              then ts_rank_cd(to_tsvector('simple', haystack), plainto_tsquery('simple', $1)) * 10
              else 0
            end
            + (
              select count(*)
              from unnest($2::text[]) term
              where haystack like '%' || term || '%'
            )
          )::float as score
        from prepared
      )
      select
        chunk_id,
        document_id,
        chunk_index,
        text,
        metadata,
        title,
        category,
        source_url,
        source_domain,
        quality_status,
        file_type,
        original_file_name,
        score
      from scored
      where score > 0
      order by score desc, created_at desc
      limit $3
    `,
    [normalizeSearchText(q), terms, limit],
  );
}

async function searchByKeywordPortable(q: string, limit: number): Promise<DbDocumentChunkRow[]> {
  const patterns = keywordTerms(q).map((term) => `%${term}%`);
  if (patterns.length === 0) return [];
  return queryDb<DbDocumentChunkRow>(
    `
      select
        c.id::text as chunk_id,
        c.document_id::text as document_id,
        c.chunk_index,
        c.text,
        c.metadata,
        d.title,
        d.category,
        coalesce(f.source_url, d.source_url) as source_url,
        d.source_domain,
        d.quality_status,
        f.file_type,
        f.original_file_name,
        1::float as score
      from document_chunks c
      join documents d on d.id = c.document_id
      left join lateral (
        select file_type, original_file_name, source_url
        from document_files
        where document_id = d.id
        order by created_at desc
        limit 1
      ) f on true
      where d.is_public = true
        and lower(coalesce(d.title, '') || ' ' || c.text) like any($1::text[])
      order by c.created_at desc
      limit $2
    `,
    [patterns, limit],
  );
}

async function embedQueryWithGemini(q: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = normalizeEmbeddingModel(process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001");
  const dimensions = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS ?? 768);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: `models/${model}`,
      content: {
        parts: [{ text: q }],
      },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: Number.isFinite(dimensions) ? dimensions : 768,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as GeminiEmbeddingResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini embedding request failed with status ${response.status}`);
  }
  const values = data.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.filter(Number.isFinite);
}

function buildResult(
  q: string,
  retrievalMode: RagRetrievalMode,
  citations: RagCitation[],
  startedAt: number,
  warning?: string,
): RagRetrievalResult {
  const normalized = citations
    .filter((citation) => citation.preview.length > 0 || (citation.text ?? "").length > 0)
    .slice(0, MAX_LIMIT)
    .map((citation, index) => ({
      ...citation,
      citationIndex: index + 1,
    }));
  const status = classifyStatus(retrievalMode, normalized);
  return {
    q,
    status,
    retrievalMode,
    total: normalized.length,
    citations: normalized,
    sourceCards: normalized.map(toSourceCard),
    contextText: buildContextText(normalized),
    latencyMs: Date.now() - startedAt,
    warning,
  };
}

function normalizeCitation(row: DbDocumentChunkRow, index = 0): RagCitation {
  const text = repairMojibake(row.text ?? "");
  const preview = compactText(text).slice(0, 600);
  return {
    citationIndex: index + 1,
    chunkId: row.chunk_id,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    title: repairMojibake(row.title || row.original_file_name || `Nguồn ${index + 1}`),
    category: row.category ? repairMojibake(row.category) : null,
    fileType: row.file_type ?? null,
    documentType: row.file_type ?? null,
    sourceUrl: row.source_url ?? null,
    sourceDomain: row.source_domain ?? null,
    score: Number(row.score ?? 0),
    preview,
    text: text.slice(0, 4000),
  };
}

function toSourceCard(citation: RagCitation): RagSourceCard {
  return {
    citationIndex: citation.citationIndex,
    title: citation.title,
    sourceUrl: citation.sourceUrl,
    sourceDomain: citation.sourceDomain,
    category: citation.category,
    fileType: citation.fileType,
    score: citation.score,
    preview: citation.preview,
    chunkId: citation.chunkId,
    documentId: citation.documentId,
  };
}

function classifyStatus(mode: RagRetrievalMode, citations: RagCitation[]): RagContextStatus {
  if (citations.length === 0) return "insufficient_data";
  const topScore = citations[0]?.score ?? 0;
  if (mode === "pgvector") {
    const minVectorScore = Number(process.env.RAG_MIN_VECTOR_SCORE ?? 0.35);
    return topScore >= minVectorScore ? "ready" : "weak";
  }
  return topScore > 0 ? "ready" : "weak";
}

function buildContextText(citations: RagCitation[]) {
  return citations
    .map((citation) => {
      const source = citation.sourceUrl ? `URL: ${citation.sourceUrl}` : "URL: chưa có";
      return `[${citation.citationIndex}] ${citation.title}\n${source}\nĐoạn trích: ${citation.text ?? citation.preview}`;
    })
    .join("\n\n");
}

async function logRagSearch(q: string, result: RagRetrievalResult, options: RetrieveOptions) {
  if (!process.env.DATABASE_URL) return;
  await queryDb(
    `
      insert into rag_search_logs (user_id, query, provider, result_count, latency_ms, metadata)
      values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      options.userId ?? null,
      q.slice(0, 2000),
      result.retrievalMode,
      result.total,
      result.latencyMs,
      JSON.stringify({
        status: result.status,
        warning: result.warning,
        officialOnly: options.officialOnly ?? true,
      }),
    ],
  );
}

function normalizeLimit(value?: number) {
  if (!value || !Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(Math.floor(value), MAX_LIMIT));
}

function keywordTerms(value: string) {
  return normalizeSearchText(value)
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .filter((term) => !VIETNAMESE_STOPWORDS.has(term))
    .slice(0, 10);
}

function hasKeywordOverlap(citation: RagCitation, terms: string[]) {
  if (terms.length === 0) return true;
  const haystack = normalizeSearchText(`${citation.title} ${citation.category ?? ""} ${citation.preview} ${citation.text ?? ""}`);
  const mandatoryTerms = terms.filter((term) => term.length >= 8 || /\d/.test(term));
  if (mandatoryTerms.length > 0) {
    return mandatoryTerms.every((term) => haystack.includes(term));
  }
  return terms.some((term) => haystack.includes(term));
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeEmbeddingModel(model: string) {
  return model.trim().replace(/^models\//, "") || "gemini-embedding-001";
}

function repairMojibake(value: string) {
  if (!/[ÃÄÂÆáºá»ðŸ]/.test(value)) return value;
  let repaired = "";
  let bytes: number[] = [];
  let raw = "";

  function flushBytes() {
    if (bytes.length === 0) return;
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
    repaired += decoded.includes("\uFFFD") ? raw : decoded;
    bytes = [];
    raw = "";
  }

  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    const cp1252Byte = cp1252ReverseMap[code];
    if (code <= 0xff) {
      bytes.push(code);
      raw += char;
    } else if (typeof cp1252Byte === "number") {
      bytes.push(cp1252Byte);
      raw += char;
    } else {
      flushBytes();
      repaired += char;
    }
  }

  flushBytes();
  return repaired.replace(/\u00a0/g, " ");
}

const cp1252ReverseMap: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

const VIETNAMESE_STOPWORDS = new Set([
  "ai",
  "anh",
  "bao",
  "bi",
  "biet",
  "cac",
  "cai",
  "can",
  "cau",
  "cho",
  "co",
  "cua",
  "duoc",
  "gi",
  "giup",
  "hay",
  "hoi",
  "khong",
  "la",
  "lam",
  "lieu",
  "mot",
  "nay",
  "neu",
  "nhung",
  "noi",
  "tai",
  "tat",
  "the",
  "thi",
  "thong",
  "tin",
  "tim",
  "toi",
  "ton",
  "tom",
  "trong",
  "tu",
  "ve",
  "voi",
]);
