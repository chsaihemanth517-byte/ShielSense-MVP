# ShieldSense Unified Scan Design

The hero scanner reuses the existing `POST /api/scan` endpoint, threat-intelligence adapters, local heuristic engine, and risk model. It adds no separate analysis engine.

| Input | Explicit user action | Data sent to the API | Never sent or stored |
|---|---|---|---|
| Link | Submit a validated HTTP(S) link | URL and `hero_url` context | Browser history or page content |
| Message | Click Scan after pasting | Message text and `hero_message` context | Messages from external apps without user action |
| File | Choose file, then click Scan | Sanitized filename, size, browser MIME type, and SHA-256 if calculated | File bytes, execution output, or sandbox actions |

File analysis is deliberately **static metadata analysis only**. ShieldSense never executes, opens, renders, or uploads the selected file. The user-facing result calls this limitation out instead of implying malware sandboxing exists.

Every result includes a bounded risk score, two-channel evidence where available, source availability, a plain-language explanation, and a `Simulated response — no real system action is performed.` label. Optional history stores only timestamp, input type, sanitized identifier, file hash where applicable, risk output, signal identifiers, provider statuses, and response action.
