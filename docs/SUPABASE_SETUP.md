# ShieldSense Supabase Setup

ShieldSense persists **only opt-in, privacy-safe scan metadata**. It does not store raw messages, URLs, page titles, sender identities, or provider response bodies by default.

## Apply the schema

Create a Supabase project, open the SQL Editor, and apply `supabase/migrations/20260822_create_scan_metadata.sql`. The migration creates one `scan_metadata` table with Row Level Security enabled. The API uses the server-only service-role key for writes; no browser policies are needed for this MVP.

## Configure environments

Copy `.env.example` to `.env.local` for local development. In Vercel, add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` under **Project Settings → Environment Variables**. Do not prefix the service-role key with `VITE_`, and never place it in the extension manifest or frontend bundle.

## Verify persistence

Submit a scan with `persistMetadata: true` only after configuring Supabase. A successful record contains the source context, SHA-256 domain hash, score, level, verdict, signal names, provider availability states, and duration. It intentionally excludes the raw submitted content.
