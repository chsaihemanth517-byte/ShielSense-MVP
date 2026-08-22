const status = document.querySelector("#status");
const result = document.querySelector("#result");

function setStatus(message) { status.textContent = message; }
function signalList(target, signals, empty) {
  target.replaceChildren();
  const entries = signals.length ? signals : [{ name: empty }];
  for (const signal of entries) { const item = document.createElement("li"); item.textContent = signal.name; target.append(item); }
}
function render(scan) {
  result.hidden = false;
  const level = document.querySelector("#risk-level");
  level.textContent = scan.riskLevel.toUpperCase();
  level.className = `level level--${scan.riskLevel}`;
  document.querySelector("#score").textContent = `${scan.riskScore}/100`;
  document.querySelector("#recommendation").textContent = scan.recommendations[0] || "Review the available signal.";
  signalList(document.querySelector("#technical"), scan.signals.filter(signal => signal.channel === "technical"), "No elevated technical signal.");
  signalList(document.querySelector("#human"), scan.signals.filter(signal => signal.channel === "human"), "No elevated human signal.");
}
async function request(action, text) {
  setStatus("Reading available signals…");
  result.hidden = true;
  const response = await chrome.runtime.sendMessage({ action, text });
  if (!response?.ok) { setStatus(response?.message || "ShieldSense could not complete this scan."); return; }
  render(response.result);
  setStatus("Scan complete. Raw content was not stored.");
}
document.querySelector("#active-tab").addEventListener("click", () => request("scan_active_tab"));
document.querySelector("#selection").addEventListener("click", () => request("scan_selected_text"));
document.querySelector("#pasted").addEventListener("click", () => request("scan_pasted_message", document.querySelector("#paste").value));
chrome.storage.session.get(["latestScan", "latestScanError"], state => { if (state.latestScan) render(state.latestScan); if (state.latestScanError) setStatus(state.latestScanError); });
