-- ShieldSense stores only privacy-safe summaries. Raw URLs, messages, page titles,
-- sender identities, and full provider payloads are deliberately excluded.
create table if not exists public.scan_metadata (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source_context text not null check (source_context in ('active_tab', 'selected_text', 'pasted_message')),
  domain_hash text,
  risk_score smallint not null check (risk_score between 0 and 100),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  verdict text not null check (verdict in ('clear', 'suspicious', 'likely_phishing', 'malicious')),
  confidence smallint not null check (confidence between 0 and 100),
  technical_signals text[] not null default '{}',
  human_signals text[] not null default '{}',
  provider_statuses jsonb not null default '{}'::jsonb,
  duration_ms integer not null check (duration_ms >= 0)
);

create index if not exists scan_metadata_created_at_idx on public.scan_metadata (created_at desc);
create index if not exists scan_metadata_risk_level_idx on public.scan_metadata (risk_level);

alter table public.scan_metadata enable row level security;
-- The server-side service role writes metadata through the API. No anonymous or
-- authenticated client policies are created because scan history is not an MVP feature.
grant usage on schema public to service_role;
grant select, insert on table public.scan_metadata to service_role;
