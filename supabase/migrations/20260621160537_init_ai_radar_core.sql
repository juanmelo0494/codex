create extension if not exists pgcrypto;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  notion_page_url text unique,
  name text not null,
  type text,
  url text not null,
  status text,
  priority text,
  cadence text,
  notes text,
  source_of_truth text not null default 'notion',
  synced_at timestamptz not null default now(),
  constraint sources_type_check
    check (
      type is null
      or type in (
        'fuente_oficial',
        'repo_tecnico',
        'comunidad',
        'medios_secundario'
      )
    ),
  constraint sources_status_check
    check (
      status is null
      or status in ('activa', 'pausada', 'descartada')
    )
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  window_start date,
  window_end date,
  status text not null,
  sources_cache_status text,
  fallback_report jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  constraint runs_status_check
    check (status in ('completed', 'failed'))
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  source_id uuid references public.sources(id),
  slug text not null,
  title text not null,
  topic text,
  source_name text not null,
  source_url text not null,
  published_on date,
  consulted_on date not null,
  evidence text not null,
  impact text not null,
  action text not null,
  status text not null,
  raw jsonb not null default '{}'::jsonb,
  unique (run_id, slug)
);

create index if not exists sources_type_idx on public.sources(type);
create index if not exists sources_url_idx on public.sources(url);
create index if not exists sources_status_idx on public.sources(status);
create index if not exists runs_generated_at_idx on public.runs(generated_at desc);
create index if not exists signals_run_id_idx on public.signals(run_id);
create index if not exists signals_published_on_idx on public.signals(published_on desc);
create index if not exists signals_consulted_on_idx on public.signals(consulted_on desc);

alter table public.sources enable row level security;
alter table public.runs enable row level security;
alter table public.signals enable row level security;

revoke all on table public.sources from anon, authenticated;
revoke all on table public.runs from anon, authenticated;
revoke all on table public.signals from anon, authenticated;

grant select, insert, update, delete on table public.sources to service_role;
grant select, insert, update, delete on table public.runs to service_role;
grant select, insert, update, delete on table public.signals to service_role;
