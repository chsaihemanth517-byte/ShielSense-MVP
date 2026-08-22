# ShieldSense Extension-to-Page Scan Bridge

## Purpose

This bridge lets an installed ShieldSense browser extension animate the public product experience with its **current scan state**. It is deliberately a summary-only channel: the event contract rejects raw URLs, message bodies, sender identities, page text, HTML, credentials, and user identifiers.

## Page-to-extension handshake

When the page loads, it generates a random `sessionId` and posts this same-origin message:

```ts
window.postMessage(
  { type: "SHIELDSENSE_PAGE_READY", version: 1, sessionId },
  window.location.origin,
);
```

The extension’s content script should retain the `sessionId` only for the page lifetime. When the visitor presses the live-scan control, the page sends `SHIELDSENSE_SCAN_REQUEST` with that session identifier. The extension must only act after matching the current page session.

## Extension-to-page event

The content script dispatches only this strict object to the same page context:

```ts
window.postMessage(
  {
    type: "SHIELDSENSE_SCAN_EVENT",
    version: 1,
    sessionId,
    scanId: "opaque-per-scan-id",
    phase: "scan_started" | "analysis_update" | "scan_complete",
    verdict: "unknown" | "clear" | "elevated" | "critical",
    signals: {
      technical: ["recent_domain", "redirect_chain"],
      human: ["urgency", "impersonation"],
    },
    timestamp: Date.now(),
  },
  window.location.origin,
);
```

## Visual-state mapping

| Extension state | Canvas state | Page treatment |
|---|---|---|
| Waiting / unavailable | `coherent` | Calm, coherent signal; no result is implied. |
| `scan_started` or `analysis_update` | `beam` | Technical scan beam and “reading” status. |
| `scan_complete` with `clear` verdict | `resolve` | Signal resolves around a clear next action. |
| `scan_complete` with elevated or critical verdict | `split` | Technical and human evidence channels separate visibly. |

The page validates source, same-origin delivery, protocol version, session identifier, event shape, allowed signal vocabulary, and field count before changing state. The event is kept in browser memory only and is not persisted by the landing page.

## Development verification only

While running the local development server, append `?scanBridgeTest=clear` or `?scanBridgeTest=elevated` to exercise the exact same page-side message validation, state transition, HUD, and canvas mapping without an installed extension. This helper is compiled out of the production experience through the development-environment guard and does not run unless the explicit query parameter is present.
