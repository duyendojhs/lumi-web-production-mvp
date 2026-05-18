"use client";

import * as React from "react";
import { AlertTriangle, ExternalLink, FileSearch, Loader2, Search, SlidersHorizontal } from "lucide-react";

interface SourceLibraryPayload {
  mode: "local_fallback" | "production_db";
  total: number;
  items: SourceItem[];
  filters: {
    categories: string[];
    fileTypes: string[];
  };
}

interface SourceItem {
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

const initialPayload: SourceLibraryPayload = {
  mode: "local_fallback",
  total: 0,
  items: [],
  filters: { categories: [], fileTypes: [] },
};

export function SourceLibrary() {
  const [query, setQuery] = React.useState("");
  const [fileType, setFileType] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [payload, setPayload] = React.useState<SourceLibraryPayload>(initialPayload);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      const params = new URLSearchParams({ limit: "120" });
      if (query.trim()) params.set("q", query.trim());
      if (fileType !== "all") params.set("fileType", fileType);
      if (category !== "all") params.set("category", category);

      fetch(`/api/sources?${params.toString()}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return (await response.json()) as SourceLibraryPayload;
        })
        .then((data) => {
          setPayload(data);
          setStatus("ready");
          setError("");
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setStatus("error");
          setError(reason instanceof Error ? reason.message : "Không tải được thư viện nguồn.");
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, fileType, category]);

  const hasFilters = payload.filters.fileTypes.length > 0 || payload.filters.categories.length > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full min-w-0 max-w-7xl flex-col gap-4 overflow-hidden">
      <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal">
              <FileSearch className="h-4 w-4" aria-hidden="true" />
              Source Library
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Thư viện nguồn Lumi
            </h1>
            <p className="mt-2 break-words text-sm leading-6 text-slate-600">
              Tra cứu tài liệu và đoạn tri thức đang được RAG/Data Layer sử dụng. Dữ liệu riêng tư, token và tích hợp cá nhân được loại khỏi danh sách.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 rounded-lg border border-line bg-mist p-2 text-center sm:grid-cols-3 lg:w-auto">
            <Metric label="Kết quả" value={String(payload.items.length)} />
            <Metric label="Tổng phù hợp" value={String(payload.total)} />
            <Metric label="Nguồn" value={payload.mode === "production_db" ? "DB" : "Local"} />
          </div>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="relative block">
            <span className="sr-only">Tìm kiếm nguồn</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tiêu đề, nhóm, domain hoặc nội dung đoạn trích..."
              className="h-11 w-full min-w-0 rounded-lg border border-line bg-white pl-10 pr-3 text-sm text-ink placeholder:text-slate-400"
            />
          </label>

          <Select label="Loại nguồn" value={fileType} onChange={setFileType} disabled={!hasFilters}>
            <option value="all">Tất cả loại nguồn</option>
            {payload.filters.fileTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>

          <Select label="Nhóm metadata" value={category} onChange={setCategory} disabled={!hasFilters}>
            <option value="all">Tất cả nhóm</option>
            {payload.filters.categories.map((item) => (
              <option key={item} value={item}>
                {formatCategory(item)}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <section className="min-h-[420px] min-w-0 overflow-hidden rounded-lg border border-line bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Danh sách nguồn</p>
            <p className="text-xs text-slate-500">Hiển thị tối đa 120 kết quả đã lọc private.</p>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-mist px-2 py-1 text-xs font-semibold text-slate-600">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {fileType === "all" && category === "all" ? "Không lọc" : "Đang lọc"}
          </div>
        </div>

        {status === "loading" ? <LoadingState /> : null}
        {status === "error" ? <ErrorState message={error} /> : null}
        {status === "ready" && payload.items.length === 0 ? <EmptyState /> : null}
        {status === "ready" && payload.items.length > 0 ? (
          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {payload.items.map((item) => (
              <SourceCard key={`${item.id}-${item.chunkIndex ?? "doc"}`} item={item} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-20 rounded-md bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  disabled,
  children,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
      >
        {children}
      </select>
    </label>
  );
}

function SourceCard({ item }: Readonly<{ item: SourceItem }>) {
  return (
    <article className="flex min-h-52 min-w-0 flex-col rounded-lg border border-line bg-white p-4 transition hover:border-teal/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {item.kind === "chunk" ? `Đoạn ${typeof item.chunkIndex === "number" ? item.chunkIndex + 1 : ""}` : "Tài liệu"}
          </p>
          <h2 className="mt-1 line-clamp-2 break-words text-base font-semibold leading-6 text-ink">{item.title}</h2>
        </div>
        {item.sourceUrl ? (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-line text-slate-600 hover:bg-mist hover:text-teal"
            aria-label="Mở nguồn gốc"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      <p className="mt-3 line-clamp-4 break-words text-sm leading-6 text-slate-600">{item.snippet || "Nguồn này chưa có đoạn trích hiển thị."}</p>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {item.category ? <Tag>{formatCategory(item.category)}</Tag> : null}
        {item.fileType ? <Tag>{item.fileType}</Tag> : null}
        {item.sourceDomain ? <Tag>{item.sourceDomain}</Tag> : null}
        {item.freshness ? <Tag>{formatFreshness(item.freshness)}</Tag> : null}
      </div>
    </article>
  );
}

function Tag({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span className="rounded-md border border-line bg-mist px-2 py-1 text-xs font-semibold text-slate-600">{children}</span>;
}

function LoadingState() {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-line bg-mist">
      <div className="text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-ink">Đang tải thư viện nguồn...</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-amber-200 bg-amber-50 px-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-amber" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-ink">Không tải được Source Library</p>
        <p className="mt-1 text-sm text-slate-600">{message || "Vui lòng thử lại sau."}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-line bg-mist px-4">
      <div className="max-w-md text-center">
        <FileSearch className="mx-auto h-7 w-7 text-teal" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-ink">Chưa có nguồn phù hợp</p>
        <p className="mt-1 text-sm text-slate-600">Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa rộng hơn.</p>
      </div>
    </div>
  );
}

function formatCategory(value: string) {
  return value.replace(/_/g, " ");
}

function formatFreshness(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}
