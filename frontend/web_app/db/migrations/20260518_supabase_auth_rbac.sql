-- Supabase Auth + RBAC hardening.
-- Run after db/schema.sql in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique,
  display_name text,
  role text not null default 'user',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists auth_user_id uuid;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists role text not null default 'user';
alter table profiles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists created_at timestamptz not null default now();
alter table profiles add column if not exists updated_at timestamptz not null default now();

update profiles set role = 'user' where role is null or role not in ('user', 'admin');
alter table profiles alter column role set default 'user';
alter table profiles alter column role set not null;
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('user', 'admin'));

create unique index if not exists idx_profiles_auth_user_id_unique on profiles(auth_user_id) where auth_user_id is not null;
create index if not exists idx_profiles_role on profiles(role);

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
