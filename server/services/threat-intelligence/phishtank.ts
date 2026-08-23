import type { ThreatIntelResult } from "../../../shared/scan.js";
import { fetchJson, normaliseScanUrl, providerNotFound, providerSkipped, providerUnavailable } from "./common.js";

type PhishTankRecord = {
  in_database?: boolean | string;
  verified?: boolean | string;
  valid?: boolean | string;
  phish_id?: number | string;
  phish_detail_page?: string;
};

function yes(value: unknown) {
  return value === true || value === "y" || value === "yes" || value === "true";
}

export async function checkPhishTank(url: string): Promise<ThreatIntelResult> {
  const normalizedUrl = normaliseScanUrl(url);
  if (!normalizedUrl) return providerSkipped("PhishTank", "No valid HTTP(S) URL was available for lookup.");
  const apiKey = process.env.PHISHTANK_API_KEY;
  if (!apiKey) return providerUnavailable("PhishTank", "missing_configuration", "PhishTank is not configured.");

  const endpoint = process.env.PHISHTANK_API_URL ?? "https://checkurl.phishtank.com/checkurl/";
  try {
    const body = new URLSearchParams({ url: normalizedUrl, format: "json", app_key: apiKey });
    const response = await fetchJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ShieldSense-MVP/1.0" },
      body,
    });
    if (response.status === 509 || response.status === 429) return providerUnavailable("PhishTank", "rate_limited", "PhishTank rate limited this lookup.");
    if (!response.ok) return providerUnavailable("PhishTank", `http_${response.status}`, "PhishTank could not complete this lookup.");

    const payload = (await response.json()) as { results?: PhishTankRecord | PhishTankRecord[] };
    const record = Array.isArray(payload.results) ? payload.results[0] : payload.results;
    if (!record || !yes(record.in_database)) return providerNotFound("PhishTank", "No submitted phishing record was found for this URL.");

    const verified = yes(record.verified) && yes(record.valid);
    return {
      source: "PhishTank",
      status: "checked",
      found: verified,
      severity: verified ? "critical" : "medium",
      confidence: verified ? 0.95 : 0.45,
      description: verified ? "PhishTank reports a verified phishing URL." : "PhishTank contains an unverified or invalidated URL record.",
      evidence: { phishId: record.phish_id ?? null, verified: yes(record.verified), valid: yes(record.valid), detailPage: record.phish_detail_page ?? null },
    };
  } catch (error) {
    const errorCode = error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "request_failed";
    return providerUnavailable("PhishTank", errorCode, "PhishTank was unavailable; local analysis continued.");
  }
}
