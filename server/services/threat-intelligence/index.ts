import type { ScanRequest, ThreatIntelResult } from "@shared/scan";
import { checkThreatFoxHost } from "./threatfox";
import { providerSkipped } from "./common";
import { checkURLhaus } from "./urlhaus";

function extractUrl(request: ScanRequest) {
  return request.url ?? (request.domain ? `https://${request.domain}` : null);
}

function extractHost(request: ScanRequest) {
  const value = extractUrl(request);
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export async function checkThreatIntelligence(request: ScanRequest): Promise<ThreatIntelResult[]> {
  const url = extractUrl(request);
  const host = extractHost(request);
  const urlhaus = url ? checkURLhaus(url) : Promise.resolve(providerSkipped("URLhaus", "No URL was supplied for lookup."));
  const threatFox = host ? checkThreatFoxHost(host) : Promise.resolve(providerSkipped("ThreatFox", "No domain or IP was supplied for lookup."));
  return Promise.all([urlhaus, threatFox]);
}
