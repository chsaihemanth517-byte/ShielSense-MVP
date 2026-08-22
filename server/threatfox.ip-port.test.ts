import { afterEach, describe, expect, it, vi } from "vitest";
import { scanRequestSchema } from "../shared/scan";
import { correlateRisk } from "./services/risk/riskEngine";
import { runLocalHeuristics } from "./services/threat-intelligence/heuristics";
import { extractThreatFoxIndicator } from "./services/threat-intelligence";
import { checkThreatFoxHost } from "./services/threat-intelligence/threatfox";

const originalFetch = globalThis.fetch;
const originalThreatFoxKey = process.env.THREATFOX_AUTH_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalThreatFoxKey === undefined) delete process.env.THREATFOX_AUTH_KEY;
  else process.env.THREATFOX_AUTH_KEY = originalThreatFoxKey;
});

describe("ThreatFox IP:port inspection", () => {
  it("preserves a literal IP port from a submitted URL for IOC lookup", () => {
    const request = scanRequestSchema.parse({
      url: "https://41.234.45.136:8808/",
      pastedMessage: "Defensive test link: https://41.234.45.136:8808/",
      sourceContext: "hero_message",
    });

    expect(extractThreatFoxIndicator(request)).toBe("41.234.45.136:8808");
  });

  it("uses the full IP:port indicator and maps a confirmed provider hit to a quarantine recommendation", async () => {
    process.env.THREATFOX_AUTH_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      query_status: "ok",
      data: [{ ioc: "41.234.45.136:8808", ioc_type: "ip:port", malware_printable: "Test malware", confidence_level: 95, threat_type: "botnet_cc", first_seen: "2026-08-23 00:00:00 UTC" }],
    }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    const request = scanRequestSchema.parse({
      url: "https://41.234.45.136:8808/",
      pastedMessage: "Defensive test link: https://41.234.45.136:8808/",
      sourceContext: "hero_message",
    });
    const provider = await checkThreatFoxHost("41.234.45.136:8808");
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const result = correlateRisk({ scanId: "ip-port-confirmed", inputType: "url", signals: runLocalHeuristics(request), providers: [provider], durationMs: 4, metadataPersisted: false });

    expect(requestBody.search_term).toBe("41.234.45.136:8808");
    expect(provider).toMatchObject({ source: "ThreatFox", status: "checked", found: true, severity: "high" });
    expect(result.riskLevel).toBe("high");
    expect(result.verdict).toBe("malicious");
    expect(result.simulatedResponse.action).toBe("quarantine");
  });
});
