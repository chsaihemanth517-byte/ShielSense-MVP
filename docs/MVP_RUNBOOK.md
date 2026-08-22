# ShieldSense MVP Runbook

## What is ready

The MVP accepts explicit scan input at `POST /api/scan`, runs local technical and human-signal heuristics, queries URLhaus and ThreatFox when a URL or host is available, optionally performs structured LLM enrichment when explicitly enabled, and returns a bounded 0–100 risk assessment. The public landing-page hero now provides the same flow for a **Link**, **File**, or **Message**. The `/demo` route and Chrome extension continue using the same API and risk engine.

File scanning is deliberately limited to static metadata: a sanitized filename, reported MIME type, byte size, and an optional SHA-256 calculated locally by the browser. ShieldSense does not upload, open, render, or execute a selected file. Static filename/MIME/size signals are treated as cautionary evidence, not malware-sandbox verdicts.

## Required Supabase action

The initial `scan_metadata` migration and service-role grants have been applied. Apply the follow-up `supabase/migrations/20260823_expand_scan_history.sql` in the Supabase SQL Editor before expecting Supabase-backed recent-history retrieval. It adds only scan IDs, input categories, sanitized history labels, optional file hashes, and simulated response actions; it does not add raw content columns.

Until the follow-up migration is applied, scans continue normally. The hero still displays the current browser-session summary, while the response truthfully reports `metadataPersisted: false` if the optional persistence write cannot succeed.

## Local development

Run `pnpm dev`, then visit `/` to use the hero scanner or send a `POST` request to `http://localhost:3000/api/scan` with a JSON body matching `shared/scan.ts`. `GET /api/scan-history?ids=<comma-separated-scan-ids>` returns only privacy-safe entries for scan IDs the requesting browser already knows; it never lists a global scan feed. The `/demo` route contains fictional `.example` scenarios. For an extension test, temporarily change `API_ORIGIN` at the top of `extension/background.js` to `http://localhost:3000`, then load the `extension/` folder through Chrome’s **Load unpacked** action.

## Vercel deployment

Vercel discovers `api/scan.ts` and `api/scan-history.ts` as serverless functions and serves the Vite client from `dist/public`. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `URLHAUS_AUTH_KEY`, and `THREATFOX_AUTH_KEY` as server-only Vercel environment variables. Redeploy after adding the variables. The extension’s production API origin must match the deployed Vercel origin in `extension/background.js`.

## Privacy model

Raw message text, URLs, page titles, sender identities, file bytes, and provider response bodies are processed only for the active request. The optional database record stores a scan ID, SHA-256 domain hash where applicable, sanitized file name or generic input label, optional file SHA-256, risk output, signal identifiers, provider availability states, source context, simulated response action, and duration—never the raw request content. URLhaus and ThreatFox are queried server-side only and are shown as skipped rather than checked when there is no URL or host. Their community APIs require an Auth-Key; PhishTank is intentionally excluded from this MVP while registrations are closed. [1] [2]

## References

[1]: https://urlhaus.abuse.ch/api/ "URLhaus Community API"
[2]: https://threatfox.abuse.ch/api/ "ThreatFox Community API"
