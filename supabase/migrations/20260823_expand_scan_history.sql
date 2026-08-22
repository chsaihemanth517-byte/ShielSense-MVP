-- Extends the existing privacy-safe scan_metadata table for unified URL, file,
-- and message history. No raw URL, raw message, or file bytes are stored.
alter table public.scan_metadata
  add column if not exists scan_id uuid,
  add column if not exists input_type text not null default 'url',
  add column if not exists input_identifier text,
  add column if not exists file_hash text,
  add column if not exists response_action text not null default 'allow';

alter table public.scan_metadata
  drop constraint if exists scan_metadata_source_context_check;

alter table public.scan_metadata
  add constraint scan_metadata_source_context_check
  check (source_context in ('active_tab', 'selected_text', 'pasted_message', 'hero_url', 'hero_file', 'hero_message'));

alter table public.scan_metadata
  add constraint scan_metadata_input_type_check
  check (input_type in ('url', 'file', 'message'));

alter table public.scan_metadata
  add constraint scan_metadata_response_action_check
  check (response_action in ('allow', 'warn', 'block', 'quarantine'));

create index if not exists scan_metadata_input_type_idx on public.scan_metadata (input_type);
create index if not exists scan_metadata_file_hash_idx on public.scan_metadata (file_hash) where file_hash is not null;
create unique index if not exists scan_metadata_scan_id_key on public.scan_metadata (scan_id) where scan_id is not null;
