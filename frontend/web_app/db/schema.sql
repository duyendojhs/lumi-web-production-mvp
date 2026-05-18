-- Lumi deployable database schema.
-- Target: Supabase/Postgres, Neon, Railway Postgres, or any managed Postgres.

create extension if not exists vector;
create extension if not exists pgcrypto;
create extension if not exists unaccent;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingestion_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null,
  source_url text,
  source_domain text,
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists connectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  connector_type text not null,
  mode text not null default 'planned',
  status text not null default 'planned',
  config jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  issue_type text not null,
  severity text not null default 'warning',
  affected_records int not null default 1,
  root_cause text,
  downstream_impact text,
  suggested_fix text,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text unique not null,
  job_name text not null default 'data_layer',
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_sec numeric,
  raw_files int,
  content_docs int,
  processed_docs int,
  chunks int,
  issues_count int,
  ocr_queue_count int,
  overall_health numeric,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists dataset_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_name text not null default 'lumi-data-layer',
  version text not null,
  snapshot_id text,
  raw_checksum_summary jsonb not null default '{}'::jsonb,
  processed_checksum_summary jsonb not null default '{}'::jsonb,
  features_checksum_summary jsonb not null default '{}'::jsonb,
  total_files int,
  total_size_bytes bigint,
  pipeline_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(dataset_name, version)
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

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_category on documents(category);
create index if not exists idx_documents_status on documents(processing_status, quality_status);
create index if not exists idx_documents_public_status on documents(is_public, processing_status, quality_status);
create index if not exists idx_documents_title_fts on documents using gin (to_tsvector('simple', coalesce(title, '')));
create index if not exists idx_document_files_document on document_files(document_id);
create index if not exists idx_document_files_checksum on document_files(checksum_sha256);
create index if not exists idx_document_chunks_document on document_chunks(document_id);
create index if not exists idx_document_chunks_text_fts on document_chunks using gin (to_tsvector('simple', coalesce(text, '')));
create index if not exists idx_quality_issues_status on data_quality_issues(status, severity);
create index if not exists idx_pipeline_runs_started_at on pipeline_runs(started_at desc);
create index if not exists idx_dataset_versions_created_at on dataset_versions(created_at desc);
create index if not exists idx_rag_search_logs_created_at on rag_search_logs(created_at desc);
create index if not exists idx_rag_search_logs_provider on rag_search_logs(provider, created_at desc);
create unique index if not exists idx_profiles_auth_user_id_unique on profiles(auth_user_id) where auth_user_id is not null;
create index if not exists idx_profiles_role on profiles(role);

-- Optional pgvector index. Tune lists/probes after real embedding volume is known.
create index if not exists idx_document_chunks_embedding
on document_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 64);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on profiles to authenticated';
    execute 'grant select on rag_search_logs to authenticated';
  end if;

  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute 'alter table profiles enable row level security';
    execute 'drop policy if exists "profiles_select_own" on profiles';
    execute 'create policy "profiles_select_own" on profiles for select to authenticated using ((select auth.uid()) is not null and auth_user_id = (select auth.uid()))';

    execute 'alter table rag_search_logs enable row level security';
    execute 'drop policy if exists "rag_search_logs_select_own" on rag_search_logs';
    execute 'create policy "rag_search_logs_select_own" on rag_search_logs for select to authenticated using (exists (select 1 from profiles p where p.id = rag_search_logs.user_id and p.auth_user_id = (select auth.uid())))';
  end if;
end $$;
