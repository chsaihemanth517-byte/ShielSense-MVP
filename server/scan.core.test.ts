import { describe, expect, it } from "vitest";
import { scanRequestSchema } from "../shared/scan";
import { correlateRisk } from "./services/risk/riskEngine";
import { runLocalHeuristics } from "./services/threat-intelligence/heuristics";

const suspiciousRequest = scanRequestSchema.parse({
  url: "https://secure-northline-verify.example/verify-account?redirect=https%3A%2F%2Fworkspace.example",
  pastedMessage: "Please verify access before 12 PM to avoid interruption.",
  sourceContext: "pasted_message",
});

describe("ShieldSense local scan engine", () => {
  it("returns explainable technical and human signals without provider access", () => {
    const signals = runLocalHeuristics(suspiciousRequest);
    expect(signals.some(signal => signal.channel === "technical" && signal.id === "redirect_parameter")).toBe(true);
    expect(signals.some(signal => signal.channel === "human" && signal.id === "threat_language")).toBe(true);
  });

  it("correlates two channels into a bounded explainable result", () => {
    const result = correlateRisk({ scanId: "scan_fixture_001", signals: runLocalHeuristics(suspiciousRequest), providers: [], durationMs: 12, metadataPersisted: false });
    expect(result.riskScore).toBeGreaterThan(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.riskLevel).toBe("medium");
    expect(result.privacy.rawContentPersisted).toBe(false);
  });

  it("rejects a scan request without user-provided input", () => {
    expect(scanRequestSchema.safeParse({ sourceContext: "active_tab" }).success).toBe(false);
  });
});
