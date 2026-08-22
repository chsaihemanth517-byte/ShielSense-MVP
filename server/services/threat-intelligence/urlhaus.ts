import type { ThreatIntelResult } from "@shared/scan";
import { fetchJson, normaliseScanUrl, providerNotFound, providerSkipped, providerUnavailable } from "./common";

type URLhausResponse = {
  query_status?: string;
  url_status?: string;
  threat?: string;
  tags?: string[];
  payloads?: Array<{ signature?: string; file_type?: string }>;
};

export async function checkURLhaus(url: string): Promise<ThreatIntelResult> {
  const normalizedUrl = normaliseScanUrl(url);
  if (!normalizedUrl) return providerSkipped("URLhaus", "No valid HTTP(S) URL was available for lookup.");
  const authKey = process.env.URLHAUS_AUTH_KEY;
  if (!authKey) return providerUnavailable("URLhaus", "missing_configuration", "URLhaus is not configured.");

  const endpoint = process.env.URLHAUS_API_URL ?? "https://urlhaus-api.abuse.ch/v1/url/";
  try {
    const response = await fetchJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Auth-Key": authKey, "User-Agent": "ShieldSense-MVP/1.0" },
      body: new URLSearchParams({ url: normalizedUrl }),
    });
    if (response.status === 429 || response.status === 509) return providerUnavailable("URLhaus", "rate_limited", "URLhaus rate limited this lookup.");
    if (!response.ok) return providerUnavailable("URLhaus", `http_${response.status}`, "URLhaus could not complete this lookup.");
    const payload = (await response.json()) as URLhausResponse;
    if (payload.query_status && payload.query_status !== "ok") return providerNotFound("URLhaus", "No malware URL record was found for this URL.");

    const active = payload.url_status === "online" || payload.url_status === "active";
    return {
      source: "URLhaus",
      status: "checked",
      found: true,
      severity: active ? "critical" : "high",
      confidence: active ? 0.93 : 0.76,
      description: `URLhaus associates this URL with malware distribution${payload.threat ? ` (${payload.threat})` : ""}.`,
      evidence: { urlStatus: payload.url_status ?? null, threat: payload.threat ?? null, tags: payload.tags ?? [], payloads: payload.payloads?.slice(0, 3) ?? [] },
    };
  } catch (error) {
    const errorCode = error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "request_failed";
    return providerUnavailable("URLhaus", errorCode, "URLhaus was unavailable; local analysis continued.");
  }
}
