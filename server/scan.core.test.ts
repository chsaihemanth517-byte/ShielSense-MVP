import { describe, expect, it } from "vitest";
import { scanHistoryEntrySchema, scanRequestSchema } from "../shared/scan";
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
    expect(result.inputType).toBe("url");
    expect(result.simulatedResponse.action).toBe("warn");
    expect(result.explanation).toContain("ShieldSense found");
    expect(result.privacy.rawContentPersisted).toBe(false);
  });

  it("treats a deceptive filename as static metadata evidence without handling file bytes", () => {
    const fileRequest = scanRequestSchema.parse({
      file: { name: "invoice.pdf.exe", size: 2048, mimeType: "application/octet-stream", sha256: "a".repeat(64) },
      sourceContext: "hero_file",
    });
    const result = correlateRisk({ scanId: "scan_fixture_file", inputType: "file", signals: runLocalHeuristics(fileRequest), providers: [], durationMs: 8, metadataPersisted: false });

    expect(result.signals.some(signal => signal.id === "double_extension")).toBe(true);
    expect(result.inputType).toBe("file");
    expect(result.simulatedResponse.action).toBe("warn");
    expect(result.explanation).toContain("static file metadata");
  });

  it("maps a confirmed high-severity threat-intelligence hit to a simulated quarantine action", () => {
    const result = correlateRisk({
      scanId: "scan_fixture_confirmed",
      inputType: "url",
      signals: [],
      providers: [{ source: "Test provider", status: "checked", found: true, severity: "high", confidence: 0.9, description: "Fixture hit" }],
      durationMs: 5,
      metadataPersisted: false,
    });

    expect(result.verdict).toBe("malicious");
    expect(result.simulatedResponse.action).toBe("quarantine");
    expect(result.simulatedResponse.disclaimer).toBe("Simulated response — no real system action is performed.");
  });

  it("rejects oversized file metadata and accepts only privacy-safe history fields", () => {
    expect(scanRequestSchema.safeParse({ file: { name: "large.pdf", size: 10 * 1024 * 1024 + 1, mimeType: "application/pdf" }, sourceContext: "hero_file" }).success).toBe(false);
    expect(scanHistoryEntrySchema.safeParse({
      scanId: "ad6dcc15-13d9-4f77-b0b8-ed3e5bcf4321",
      createdAt: "2026-08-23T12:00:00.000Z",
      inputType: "file",
      inputIdentifier: "invoice.pdf",
      fileHashPrefix: "0123456789ab",
      riskScore: 25,
      riskLevel: "medium",
      verdict: "suspicious",
      responseAction: "warn",
    }).success).toBe(true);
  });

  it("rejects a scan request without user-provided input", () => {
    expect(scanRequestSchema.safeParse({ sourceContext: "active_tab" }).success).toBe(false);
  });
});
