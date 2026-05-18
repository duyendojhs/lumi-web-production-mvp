"use client";

import { useMemo, useState } from "react";
import { Copy, Database, ExternalLink, FileText, Layers3, Search, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DataCatalogRecord, DataChunkRecord, ProductionReadiness } from "@/lib/server/dataLayerOutputs";
import { Panel, StatusBadge } from "@/components/dashboard/Primitives";
import { CategoryBarChart, ChunkHistogram } from "@/components/data-layer/DataLayerCharts";

export function FeatureExplorer({
  catalog,
  chunks,
  histogram = [],
  chunksByCategory = [],
  productionReadiness,
}: Readonly<{
  catalog: DataCatalogRecord[];
  chunks: DataChunkRecord[];
  histogram?: Array<Record<string, string | number>>;
  chunksByCategory?: Array<Record<string, string | number>>;
  productionReadiness: ProductionReadiness;
}>) {
  const docs = useMemo(() => catalog.filter((row) => row.is_content_document), [catalog]);
  const [query, setQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<string>(docs[0]?.document_id ?? "");
  const selected = docs.find((row) => row.document_id === selectedDoc) ?? docs[0];
  const normalized = query.trim().toLowerCase();
  const visibleDocs = docs.filter((row) => !normalized || `${row.title} ${row.category} ${row.source_domain ?? ""}`.toLowerCase().includes(normalized));
  const visibleChunks = chunks
    .filter((chunk) => chunk.is_content_document)
    .filter((chunk) => !selected?.document_id || chunk.document_id === selected.document_id)
    .filter((chunk) => !normalized || `${chunk.text} ${chunk.title ?? ""}`.toLowerCase().includes(normalized));
  const contentChunks = useMemo(() => chunks.filter((chunk) => chunk.is_content_document), [chunks]);
  const searchableDocs = useMemo(() => new Set(contentChunks.map((chunk) => chunk.document_id)).size, [contentChunks]);
  const avgChunkLength = Math.round(contentChunks.reduce((sum, chunk) => sum + Number(chunk.char_count ?? 0), 0) / Math.max(1, contentChunks.length));
  const ocrGap = docs.filter((row) => (row.issues ?? []).includes("pdf_sample_needs_ocr")).length;
  const rag = productionReadiness.ragIndex;

  return (
    <div className="grid gap-3">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <FeatureCard icon={Layers3} label="Chunk nội dung" value={contentChunks.length} note="đơn vị AI/search đang dùng" status="ready" />
        <FeatureCard icon={FileText} label="Tài liệu tìm kiếm" value={searchableDocs} note={`${docs.length} tài liệu nội dung`} status="ready" />
        <FeatureCard icon={Database} label="Độ dài TB" value={avgChunkLength} note="ký tự mỗi chunk" status="healthy" />
        <FeatureCard icon={Sparkles} label="Vector index" value="Kế hoạch" note="chưa sinh embeddings" status="planned" />
        <FeatureCard icon={Search} label="Khoảng trống OCR" value={ocrGap} note="PDF trước khi phủ AI đầy đủ" status={ocrGap ? "warning" : "healthy"} />
      </section>
      <section className="grid gap-3 xl:grid-cols-12">
        <Panel title="Histogram độ dài chunk" subtitle="X: bucket độ dài; Y: số chunk nội dung" className="xl:col-span-5">
          <ChunkHistogram data={histogram} />
        </Panel>
        <Panel title="Chunk theo nhóm" subtitle="Coverage feature theo nhóm nội dung" className="xl:col-span-4">
          <CategoryBarChart data={chunksByCategory} xLabel="Nhóm nội dung" yLabel="Chunk" />
        </Panel>
        <Panel title="Roadmap tính năng" subtitle="Đã triển khai và kế hoạch" className="xl:col-span-3">
          <div className="grid gap-2 text-sm">
            <Roadmap label="Chunks" state="implemented" />
            <Roadmap label="Keyword search index" state="implemented" />
            <Roadmap label="Vector embeddings" state="planned" />
            <Roadmap label="RAG/vector DB" state="planned" />
          </div>
        </Panel>
      </section>
      <Panel title="Lineage tính năng" subtitle="Cách nội dung thành tài sản sẵn sàng cho AI">
        <div className="grid gap-2 md:grid-cols-5">
          {[
            ["Tài liệu", `${docs.length} tài liệu nội dung`, "ready"],
            ["Processed text", `${searchableDocs} tài liệu có chunk`, "ready"],
            ["Chunks", `${contentChunks.length} chunk nội dung`, "ready"],
            ["Embeddings", "kế hoạch", "planned"],
            ["Chat/Search", "RAG tiếp theo", "active"],
          ].map(([label, value, status], index) => (
            <div key={label} className="relative rounded-lg border border-line bg-mist p-3">
              {index < 4 ? <div className="absolute -right-3 top-1/2 hidden h-0.5 w-6 bg-line md:block" /> : null}
              <p className="text-sm font-semibold text-ink">{label}</p>
              <p className="mt-1 text-xs text-slate-500">{value}</p>
              <div className="mt-2"><StatusBadge status={status} /></div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Sẵn sàng RAG" subtitle="Keyword index local đã có; embeddings/vector DB là phần mở rộng">
        <div className="grid gap-3 md:grid-cols-4">
          <RagCard label="Chunk đã index" value={String(rag.chunks_indexed ?? 0)} status={rag.keyword_index_ready ? "ready" : "planned"} />
          <RagCard label="Keyword index" value={rag.keyword_index_ready ? "sẵn sàng" : "chưa build"} status={rag.keyword_index_ready ? "ready" : "planned"} />
          <RagCard label="Embeddings" value={rag.embedding_status === "ready" ? "sẵn sàng" : "chưa sinh"} status={rag.embedding_status === "ready" ? "ready" : "planned"} />
          <RagCard label="Vector DB" value={rag.vector_db_status === "ready" ? "sẵn sàng" : "kế hoạch"} status="planned" />
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_260px]">
          <p className="rounded-lg bg-mist px-3 py-2 text-sm leading-6 text-slate-700">
            Dùng <code className="rounded bg-white px-1">/api/rag/search?q=tuyen%20sinh</code> để smoke test tìm kiếm RAG.
          </p>
          <a href="/api/data-layer/rag-search?q=tuyen%20sinh" target="_blank" className="rounded-lg border border-line bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-mist">
            Mở API search demo
          </a>
        </div>
      </Panel>
      <section className="grid gap-3 xl:grid-cols-[0.75fr_1.25fr]">
      <Panel title="Tài liệu nội dung" subtitle="Chọn tài liệu để xem các chunk đã sinh">
        <label className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-mist px-3 py-2 text-xs">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tài liệu/chunk" className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <div className="max-h-[520px] overflow-auto">
          <div className="grid gap-2">
            {visibleDocs.slice(0, 80).map((row) => (
              <button
                key={row.document_id}
                onClick={() => setSelectedDoc(row.document_id)}
                className={`rounded-lg border p-2 text-left hover:bg-mist ${selected?.document_id === row.document_id ? "border-teal bg-teal/5" : "border-line bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold leading-5 text-ink" title={row.title}>{row.title}</p>
                  <span className="rounded-md bg-mist px-2 py-1 text-[11px] font-semibold text-teal">{row.file_type}</span>
                </div>
                <p className="mt-1 text-xs leading-4 text-slate-500" title={`${row.category} - ${row.source_domain || "local"}`}>{row.category} - {row.source_domain || "local"}</p>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Xem trước chunk" subtitle={selected ? selected.title : "Chưa chọn tài liệu"}>
        {selected ? (
          <div className="grid gap-3">
            <div className="grid gap-2 rounded-lg border border-line bg-mist p-3 text-xs md:grid-cols-4">
              <Mini label="Loại" value={selected.file_type} />
              <Mini label="Nhóm" value={selected.category} />
              <Mini label="Chunks" value={String(visibleChunks.length)} />
              <Mini label="Nguồn" value={selected.source_domain || "local"} />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selected.ingestion_status === "ok" ? "healthy" : "warning"} />
              {selected.source_url ? (
                <a href={selected.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-mist">
                  <ExternalLink className="h-3.5 w-3.5" /> Mở URL nguồn
                </a>
              ) : null}
            </div>
            <div className="max-h-[430px] overflow-auto">
              <div className="grid gap-2">
                {visibleChunks.slice(0, 12).map((chunk) => (
                  <article key={chunk.chunk_id} className="rounded-lg border border-line bg-mist p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink"><FileText className="h-3.5 w-3.5 text-teal" /> chunk #{chunk.chunk_index}</span>
                      <button onClick={() => navigator.clipboard?.writeText(chunk.text)} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"><Copy className="h-3 w-3" /> Sao chép</button>
                    </div>
                    <p className="max-h-[120px] overflow-auto pr-1 text-xs leading-5 text-slate-700">{preview(chunk.text, query)}</p>
                    <p className="mt-2 text-[11px] text-slate-500">{chunk.char_count} ký tự - {chunk.word_count} từ</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Chưa chọn tài liệu nội dung.</p>
        )}
      </Panel>
      </section>
    </div>
  );
}

function Mini({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 truncate font-semibold text-ink">{value}</p></div>;
}

function FeatureCard({ icon: Icon, label, value, note, status }: Readonly<{ icon: LucideIcon; label: string; value: string | number; note: string; status: string }>) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
          <p className="mt-1 truncate text-lg font-bold text-ink">{value}</p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-mist text-teal"><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs leading-4 text-slate-500" title={note}>{note}</p>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function RagCard({ label, value, status }: Readonly<{ label: string; value: string; status: string }>) {
  return (
    <div className="rounded-lg border border-line bg-mist p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 break-words text-xs leading-4 text-slate-600">{value}</p>
    </div>
  );
}

function preview(text: string, query: string) {
  const output = text.length > 380 ? `${text.slice(0, 380)}...` : text;
  const term = query.trim();
  if (!term) return output;
  const index = output.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) return output;
  return (
    <>
      {output.slice(0, index)}
      <mark className="rounded bg-amber-100 px-0.5">{output.slice(index, index + term.length)}</mark>
      {output.slice(index + term.length)}
    </>
  );
}

function Roadmap({ label, state }: Readonly<{ label: string; state: "implemented" | "planned" }>) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-mist px-3 py-2">
      <span className="font-semibold leading-5 text-ink">{label}</span>
      <StatusBadge status={state === "implemented" ? "ready" : "planned"} />
    </div>
  );
}
