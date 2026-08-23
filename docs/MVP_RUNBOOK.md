# ShieldSense MVP Runbook

## What is ready

The MVP accepts explicit scan input at `POST /api/scan`, runs local technical and human-signal heuristics, queries URLhaus and ThreatFox when a URL or host is available, optionally performs structured LLM enrichment when explicitly enabled, and returns a bounded 0–100 risk assessment. The landing-page **Get ShieldSense** call-to-action opens `/live-read`, an original-style workspace with a chat-like composer for pasted text and safe file attachments, plus a left-side privacy-safe history rail. The `/demo` route and Chrome extension continue using the same API and risk engine.

File scanning is deliberately limited to static metadata: a sanitized filename, reported MIME type, byte size, and an optional SHA-256 calculated locally by the browser. ShieldSense does not upload, open, render, or execute a selected file. Static filename/MIME/size signals are treated as cautionary evidence, not malware-sandbox verdicts.

## Required Supabase action

The initial `scan_metadata` migration, the follow-up `supabase/migrations/20260823_expand_scan_history.sql`, and service-role grants have been applied. The follow-up migration adds only scan IDs, input categories, sanitized history labels, optional file hashes, and simulated response actions; it does not add raw content columns.

Scans continue normally even if optional persistence becomes unavailable. Live Reading and Agent Console responses truthfully report `metadataPersisted: false` if the optional privacy-safe metadata write cannot succeed.

## Local development

Run `pnpm dev`, then visit `/live-read` for the chat-style live-reading workspace, `/agent` for the controlled Agent Console, or send a `POST` request to `http://localhost:3000/api/scan` with a JSON body matching `shared/scan.ts`. `GET /api/scan-history?ids=<comma-separated-scan-ids>` returns only privacy-safe entries for scan IDs the requesting browser already knows; it never lists a global scan feed. The `/demo` route contains fictional `.example` scenarios. For an extension test, temporarily change `API_ORIGIN` at the top of `extension/background.js` to `http://localhost:3000`, then load the `extension/` folder through Chrome’s **Load unpacked** action.

The Live Reading composer automatically extracts the first valid explicit `http://` or `https://` link from pasted text and sends it alongside the text for the current scan. This preserves human-manipulation analysis while making URLhaus and ThreatFox eligible for a real URL/domain lookup. The UI names the extracted link and the lookup stage; provider results still show their actual `checked`, `not_found`, `unavailable`, or `skipped` status.

## Controlled Agent Console

`/agent` is a **demo-only** workspace. Its Start, Pause, Resume, Stop, and Reset controls operate a browser-session timer over five clearly labeled controlled mock-inbox events; they do not run a background job and they do not connect to a mailbox, browser, endpoint, or file system. Each selected event calls `POST /api/agent/scan`, which converts the controlled input into the existing `/api/scan` service contract, persists the normal privacy-safe scan metadata, and returns the same risk result, provider states, recommendations, and simulated response used everywhere else.

High- and critical-risk reads automatically create an in-session incident report from the structured scan result. The report contains a sanitized target, risk result, provider status, signal names, recommendations, and the simulated response disclaimer. It never includes raw mock message bodies, private content, full webpage data, or file bytes. The underlying scan metadata remains available through the existing scoped history mechanism; the presentation report is intentionally session-scoped in this demo.

`POST /api/chat` provides factual scan-context security answers. It accepts a question and an optional completed `ScanResult`. Without a result it asks for a scan; with one it only summarizes that result’s risk score, signals, recommendations, and actual provider statuses. It does not claim an intelligence lookup ran when it was skipped or unavailable, and it does not execute actions. The implementation is deterministic and grounded by design; no new client-side model key is used.

## Vercel deployment

Vercel discovers `api/scan.ts`, `api/scan-history.ts`, `api/agent-scan.ts`, `api/agent/scan.ts`, and `api/chat.ts` as serverless functions and serves the Vite client from `dist/public`. The `vercel.json` route order is filesystem-first, so these APIs resolve before the SPA fallback handles client pages. Because this project is an ESM package, the scan and agent function import graph must use explicit `.js` relative specifiers; extensionless TypeScript imports compile but cause Node’s Vercel runtime to raise `ERR_MODULE_NOT_FOUND` before a handler can respond. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `URLHAUS_AUTH_KEY`, and `THREATFOX_AUTH_KEY` as server-only Vercel environment variables for **Production**, then redeploy after adding the variables. The current Vercel project has no configured environment variables, so this setup is required before provider lookups and optional privacy-safe persistence can operate in production. The extension’s production API origin must match the deployed Vercel origin in `extension/background.js`.

## Privacy model

Raw message text, URLs, page titles, sender identities, file bytes, and provider response bodies are processed only for the active request. The optional database record stores a scan ID, SHA-256 domain hash where applicable, sanitized file name or generic input label, optional file SHA-256, risk output, signal identifiers, provider availability states, source context, simulated response action, and duration—never the raw request content. URLhaus and ThreatFox are queried server-side only and are shown as skipped rather than checked when there is no URL or host. Their community APIs require an Auth-Key; PhishTank is intentionally excluded from this MVP while registrations are closed. [1] [2]

## References

[1]: https://urlhaus.abuse.ch/api/ "URLhaus Community API"
[2]: https://threatfox.abuse.ch/api/ "ThreatFox Community API"
