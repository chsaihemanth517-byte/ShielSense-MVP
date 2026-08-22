const API_ORIGIN = "https://shield-sense-landing-page-industry.vercel.app";

async function postScan(payload) {
  const response = await fetch(`${API_ORIGIN}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ ...payload, persistMetadata: false }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || "ShieldSense could not complete this scan.");
  await chrome.storage.session.set({ latestScan: data, latestScanAt: Date.now() });
  await chrome.action.setBadgeText({ text: data.riskLevel === "low" ? "OK" : data.riskLevel.toUpperCase().slice(0, 2) });
  await chrome.action.setBadgeBackgroundColor({ color: data.riskLevel === "low" ? "#167c5d" : "#d85a38" });
  return data;
}

function safeTabUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function selectedText(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.getSelection()?.toString().trim().slice(0, 8000) || "",
  });
  return result?.result || "";
}

async function scanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = safeTabUrl(tab?.url);
  if (!url) throw new Error("ShieldSense can scan only a normal HTTP or HTTPS page.");
  return postScan({ url, pageTitle: String(tab.title || "").slice(0, 300), sourceContext: "active_tab" });
}

async function scanSelectedText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab was available.");
  const text = await selectedText(tab.id);
  if (!text) throw new Error("Select message text on the current page before scanning.");
  const url = safeTabUrl(tab.url);
  return postScan({ ...(url ? { url } : {}), pageTitle: String(tab.title || "").slice(0, 300), selectedText: text, sourceContext: "selected_text" });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "shieldsense-selection", title: "Analyze selected text with ShieldSense", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener(async info => {
  if (info.menuItemId !== "shieldsense-selection" || !info.selectionText) return;
  try {
    await postScan({ selectedText: info.selectionText.slice(0, 8000), sourceContext: "selected_text" });
  } catch (error) {
    await chrome.storage.session.set({ latestScanError: error instanceof Error ? error.message : "ShieldSense could not complete this scan." });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const action = message?.action;
  const run = action === "scan_active_tab" ? scanActiveTab() : action === "scan_selected_text" ? scanSelectedText() : action === "scan_pasted_message" ? postScan({ pastedMessage: String(message.text || "").slice(0, 8000), sourceContext: "pasted_message" }) : null;
  if (!run) return false;
  run.then(result => sendResponse({ ok: true, result })).catch(error => sendResponse({ ok: false, message: error instanceof Error ? error.message : "Scan failed." }));
  return true;
});
