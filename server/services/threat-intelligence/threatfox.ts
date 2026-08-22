import type { ThreatIntelResult } from "@shared/scan";
import { fetchJson, isIpAddress, providerNotFound, providerSkipped, providerUnavailable } from "./common";

type ThreatFoxRecord = { ioc?: string; ioc_type?: string; malware_printable?: string; confidence_level?: number; threat_type?: string; first_seen?: string };
type ThreatFoxResponse = { query_status?: string; data?: ThreatFoxRecord[] };

async function checkThreatFoxIndicator(indicator: string, expected: "domain" | "ip"): Promise<ThreatIntelResult> {
  if (!indicator) return providerSkipped("ThreatFox", `No ${expected} indicator was available for lookup.`);
  const authKey = process.env.THREATFOX_AUTH_KEY;
  if (!authKey) return providerUnavailable("ThreatFox", "missing_configuration", "ThreatFox is not configured.");
  const endpoint = process.env.THREATFOX_API_URL ?? "https://threatfox-api.abuse.ch/api/v1/";

  try {
    const response = await fetchJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Auth-Key": authKey, "User-Agent": "ShieldSense-MVP/1.0" },
      body: JSON.stringify({ query: "search_ioc", search_term: indicator, exact_match: true }),
    });
    if (response.status === 429 || response.status === 509) return providerUnavailable("ThreatFox", "rate_limited", "ThreatFox rate limited this lookup.");
    if (!response.ok) return providerUnavailable("ThreatFox", `http_${response.status}`, "ThreatFox could not complete this lookup.");
    const payload = (await response.json()) as ThreatFoxResponse;
    const record = payload.data?.[0];
    if (payload.query_status !== "ok" || !record) return providerNotFound("ThreatFox", `No malware IOC record was found for this ${expected}.`);

    return {
      source: "ThreatFox",
      status: "checked",
      found: true,
      severity: "high",
      confidence: Math.min(1, Math.max(0.3, (record.confidence_level ?? 50) / 100)),
      description: `ThreatFox associates this ${expected} with ${record.malware_printable ?? "a known malware family"}.`,
      evidence: { ioc: record.ioc ?? indicator, iocType: record.ioc_type ?? null, malware: record.malware_printable ?? null, threatType: record.threat_type ?? null, firstSeen: record.first_seen ?? null },
    };
  } catch (error) {
    const errorCode = error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "request_failed";
    return providerUnavailable("ThreatFox", errorCode, "ThreatFox was unavailable; local analysis continued.");
  }
}

export function checkThreatFoxDomain(domain: string) {
  return checkThreatFoxIndicator(domain, "domain");
}

export function checkThreatFoxIP(ip: string) {
  return checkThreatFoxIndicator(ip, "ip");
}

export function checkThreatFoxHost(host: string): Promise<ThreatIntelResult> {
  return isIpAddress(host) ? checkThreatFoxIP(host) : checkThreatFoxDomain(host);
}
