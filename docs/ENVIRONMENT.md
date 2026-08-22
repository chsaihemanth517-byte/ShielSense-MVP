# ShieldSense Environment Variables

Configure these values through the local development environment and Vercel project settings. Do not commit an `.env` or `.env.example` file, and do not expose any server-side key through a `VITE_` variable or the Chrome extension.

| Variable | Required for | Where it may run |
|---|---|---|
| `SUPABASE_URL` | Privacy-safe scan metadata persistence | Server only |
| `SUPABASE_ANON_KEY` | Future browser-facing Supabase configuration; not used by the scan API | Public client only if explicitly needed later |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side metadata write operations | Server only |
| `URLHAUS_AUTH_KEY` | URLhaus malware URL lookup | Server only |
| `URLHAUS_API_URL` | Optional URLhaus API base override | Server only |
| `THREATFOX_AUTH_KEY` | ThreatFox IOC enrichment | Server only |
| `THREATFOX_API_URL` | Optional ThreatFox API base override | Server only |
| `SHIELDSENSE_ENABLE_LLM` | Optional structured human-manipulation enrichment; set to `true` only after reviewing credit usage | Server only |
| `SHIELDSENSE_API_ORIGIN` | Chrome extension allowlist and local API target | Extension build configuration only |

The provider URLs have safe defaults in the server-side adapters. Missing provider secrets never mark an indicator as safe: they produce an explicit `unavailable` source state while local ShieldSense heuristics continue to return an assessment. **PhishTank is intentionally not part of the active MVP pipeline** while new application registrations are unavailable.
