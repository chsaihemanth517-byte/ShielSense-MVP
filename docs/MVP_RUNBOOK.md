# ShieldSense MVP Runbook

## What is ready

The MVP accepts explicit scan input at `POST /api/scan`, runs local technical and human-signal heuristics, queries URLhaus and ThreatFox when configured, optionally performs structured LLM enrichment when explicitly enabled, and returns a bounded 0–100 risk assessment. The `/demo` route uses that API directly. The Chrome extension exposes the same flow from an active tab, selected text, or manually pasted message.

## Required Supabase action

The supplied Supabase project is reachable and the service-role key validates. The `scan_metadata` table is **not yet present**: the project REST check returned `404`. Apply `supabase/migrations/20260822_create_scan_metadata.sql` in the Supabase SQL Editor before using `persistMetadata: true`. Until then, scans continue normally and accurately report `metadataPersisted: false`.

## Local development

Run `pnpm dev`, then send a `POST` request to `http://localhost:3000/api/scan` with a JSON body matching `shared/scan.ts`. The `/demo` route contains fictional `.example` scenarios. For an extension test, temporarily change `API_ORIGIN` at the top of `extension/background.js` to `http://localhost:3000`, then load the `extension/` folder through Chrome’s **Load unpacked** action.

## Vercel deployment

Vercel discovers `api/scan.ts` as the scan function and serves the Vite client from `dist/public`. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `URLHAUS_AUTH_KEY`, and `THREATFOX_AUTH_KEY` as server-only Vercel environment variables. Redeploy after adding the variables. The extension’s production API origin must match the deployed Vercel origin in `extension/background.js`.

## Privacy model

Raw message text, URLs, page titles, sender identities, and provider response bodies are processed only for the active request. The optional database record stores a SHA-256 domain hash, risk output, signal identifiers, provider availability states, source context, and duration—never the raw request content. URLhaus and ThreatFox are queried server-side only. Their community APIs require an Auth-Key; PhishTank is intentionally excluded from this MVP while registrations are closed. [1] [2]

## References

[1]: https://urlhaus.abuse.ch/api/ "URLhaus Community API"
[2]: https://threatfox.abuse.ch/api/ "ThreatFox Community API"
