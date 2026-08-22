# ShieldSense Local Configuration Template

Use this as a checklist when creating a **local, untracked** `.env.local` file through your development environment. Do not copy this block into source control, and do not prefix server-side variables with `VITE_`.

```dotenv
# Required to persist opt-in, privacy-safe scan metadata
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key

# Required for active server-side malware and IOC enrichment
URLHAUS_AUTH_KEY=your-abuse-ch-auth-key
THREATFOX_AUTH_KEY=your-abuse-ch-auth-key

# Optional; disabled by default so the scan works with local heuristics only
SHIELDSENSE_ENABLE_LLM=false

# Optional local extension target
SHIELDSENSE_API_ORIGIN=http://localhost:3000
```

The Chrome extension API origin is configured separately in `extension/background.js`. Do not put Supabase or threat-intelligence keys in the extension, Vite variables, browser local storage, or client code.
