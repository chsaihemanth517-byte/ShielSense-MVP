import { describe, expect, it } from "vitest";
import { extensionScanEventSchema, sceneModeForScan } from "../shared/extensionScan";

const baseEvent = {
  type: "SHIELDSENSE_SCAN_EVENT" as const,
  version: 1 as const,
  sessionId: "session_1234567890",
  scanId: "scan_12345678",
  phase: "scan_complete" as const,
  verdict: "elevated" as const,
  signals: { technical: ["recent_domain"], human: ["urgency"] },
  timestamp: 1_786_000_000_000,
};

describe("extension scan event contract", () => {
  it("accepts only the summary-only scan event shape", () => {
    expect(extensionScanEventSchema.parse(baseEvent)).toMatchObject(baseEvent);
    expect(extensionScanEventSchema.safeParse({ ...baseEvent, rawUrl: "https://not-allowed.example" }).success).toBe(false);
  });

  it("maps scan outcomes to cinematic scene modes", () => {
    const elevatedEvent = extensionScanEventSchema.parse(baseEvent);
    const clearEvent = extensionScanEventSchema.parse({ ...baseEvent, verdict: "clear" });

    expect(sceneModeForScan("waiting", null)).toBe("coherent");
    expect(sceneModeForScan("scanning", null)).toBe("beam");
    expect(sceneModeForScan("complete", elevatedEvent)).toBe("split");
    expect(sceneModeForScan("complete", clearEvent)).toBe("resolve");
  });
});
