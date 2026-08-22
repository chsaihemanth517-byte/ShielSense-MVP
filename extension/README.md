# ShieldSense Chrome Extension MVP

The extension is a **Manifest V3** proof of the ShieldSense scan flow. It uses only `activeTab`, `scripting`, `storage`, and `contextMenus`; it does not run automatically on every page and has no broad `<all_urls>` content-script permission.

## Load locally

Open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose this `extension/` folder. The production API origin is configured at the top of `background.js`. Change it to `http://localhost:3000` while testing the local Express server.

## Explicit scan paths

The popup can analyze the active HTTP(S) tab, the text currently selected by the user, or a manually pasted message. A context-menu action is available only after the user selects text. Each request sets `persistMetadata: false`; the extension does not persist message text, URLs, or scan results beyond the browser session storage used to display the latest result.

## Required deployment step

Before using the production extension, deploy the Vercel `/api/scan` function and configure its server-only Supabase, URLhaus, and ThreatFox variables. Do not add provider credentials to `manifest.json`, `background.js`, `popup.js`, or any client bundle.
