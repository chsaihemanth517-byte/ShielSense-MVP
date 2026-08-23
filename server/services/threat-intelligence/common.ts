import type { ThreatIntelResult } from "../../../shared/scan.js";

export const PROVIDER_TIMEOUT_MS = 4500;

export function providerUnavailable(source: string, errorCode: string, description: string): ThreatIntelResult {
  return { source, status: "unavailable", found: false, description, errorCode };
}

export function providerSkipped(source: string, description: string): ThreatIntelResult {
  return { source, status: "skipped", found: false, description };
}

export function providerNotFound(source: string, description: string): ThreatIntelResult {
  return { source, status: "not_found", found: false, description };
}

export async function fetchJson(url: string, init: RequestInit, timeoutMs = PROVIDER_TIMEOUT_MS): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

export function normaliseScanUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isIpAddress(value: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || /^[0-9a-f:]+$/i.test(value);
}
