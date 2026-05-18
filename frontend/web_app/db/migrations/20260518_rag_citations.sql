-- Production RAG citations support.
-- Safe to run after db/schema.sql; all objects are idempotent.

create extension if not exists vector;
create extension if not exists pgcrypto;
create extension if not exists unaccent;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  title text not null,
  category text not null default 'khac',
  language text default 'vi',
  source_url text,
  source_domain text,
  owner text default 'Lumi Data Team',
  tags text[] not null default '{}',
  is_public boolean not null default true,
  quality_status text not null default 'unknown',
  processing_status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_files (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  file_type text not null,
  storage_provider text not null default 'supabase',
  bucket text,
  object_key text,
  original_file_name text,
  source_url text,
  checksum_sha256 text,
  file_size_bytes bigint,
  page_count int,
  needs_ocr boolean not null default false,
  ocr_status text not null default 'not_required',
  ocr_text_object_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null,
  text text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768),
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create table if not exists rag_search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  query text not null,
  provider text not null default 'keyword',
  result_count int not null default 0,
  latency_ms int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_public_status on documents(is_public, processing_status, quality_status);
create index if not exists idx_documents_title_fts on documents using gin (to_tsvector('simple', coalesce(title, '')));
create index if not exists idx_document_files_document on document_files(document_id);
create index if not exists idx_document_chunks_document on document_chunks(document_id);
create index if not exists idx_document_chunks_text_fts on document_chunks using gin (to_tsvector('simple', coalesce(text, '')));
create index if not exists idx_document_chunks_embedding
on document_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 64);
create index if not exists idx_rag_search_logs_created_at on rag_search_logs(created_at desc);
create index if not exists idx_rag_search_logs_provider on rag_search_logs(provider, created_at desc);
