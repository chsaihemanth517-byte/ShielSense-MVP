import type { ScanRequest, ThreatIntelResult } from "@shared/scan";
import { checkThreatFoxHost } from "./threatfox";
import { isIpAddress, providerSkipped } from "./common";
import { checkURLhaus } from "./urlhaus";

function extractUrl(request: ScanRequest) {
  return request.url ?? (request.domain ? `https://${request.domain}` : null);
}

export function extractThreatFoxIndicator(request: ScanRequest) {
  const value = extractUrl(request);
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname;
    return isIpAddress(host) && parsed.port ? `${host}:${parsed.port}` : host;
  } catch {
    return null;
  }
}

export async function checkThreatIntelligence(request: ScanRequest): Promise<ThreatIntelResult[]> {
  const url = extractUrl(request);
  const threatFoxIndicator = extractThreatFoxIndicator(request);
  const urlhaus = url ? checkURLhaus(url) : Promise.resolve(providerSkipped("URLhaus", "No URL was supplied for lookup."));
  const threatFox = threatFoxIndicator ? checkThreatFoxHost(threatFoxIndicator) : Promise.resolve(providerSkipped("ThreatFox", "No domain or IP was supplied for lookup."));
  return Promise.all([urlhaus, threatFox]);
}
