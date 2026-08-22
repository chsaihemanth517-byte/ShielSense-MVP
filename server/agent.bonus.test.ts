import { describe, expect, it } from "vitest";
import { createIncidentReport, shouldGenerateIncident } from "../shared/incident";
import { scanResultSchema } from "../shared/scan";
import { mockEventToScanRequest, mockInboxEvents } from "./services/agent/mockInbox";
import { answerGroundedSecurityQuestion } from "./services/chat/securityChat";

const confirmedResult = scanResultSchema.parse({
  scanId: "a6dcc15-13d9-4f77-b0b8-ed3e5bcf4321",
  inputType: "url",
  riskScore: 90,
  riskLevel: "critical",
  verdict: "malicious",
  confidence: 86,
  signals: [
    { id: "ip_literal", channel: "technical", source: "ShieldSense", name: "IP address destination", severity: "medium", description: "A literal IP was supplied.", weight: 18 },
    { id: "urgency", channel: "human", source: "ShieldSense", name: "Urgency language", severity: "medium", description: "Urgency was detected.", weight: 10 },
  ],
  providers: [
    { source: "URLhaus", status: "not_found", found: false, description: "No malware URL record was found for this URL." },
    { source: "ThreatFox", status: "checked", found: true, severity: "high", confidence: 0.92, description: "ThreatFox associates this domain with a known malware family." },
  ],
  recommendations: ["Do not open the link or attachment.", "Verify the request through a known independent channel."],
  explanation: "ShieldSense found recorded evidence and a matching threat-intelligence source.",
  simulatedResponse: { action: "quarantine", label: "QUARANTINE", disclaimer: "Simulated response — no real system action is performed." },
  privacy: { rawContentPersisted: false, metadataPersisted: true },
  durationMs: 38,
});

describe("ShieldSense bonus demo contracts", () => {
  it("uses controlled mock inbox inputs and retains static-only file metadata", () => {
    const invoice = mockInboxEvents.find(event => event.id === "mock-invoice");
    expect(invoice).toBeDefined();
    const request = mockEventToScanRequest(invoice!);
    expect(request.file?.name).toBe("Invoice_48391.pdf.exe");
    expect(request.persistMetadata).toBe(true);
    expect(request.file?.sha256).toHaveLength(64);
  });

  it("automatically generates a privacy-safe incident report from the structured scan result", () => {
    expect(shouldGenerateIncident(confirmedResult)).toBe(true);
    const report = createIncidentReport(confirmedResult, "suspicious.example", "2026-08-23T12:00:00.000Z");

    expect(report.incidentId).toMatch(/^SS-/);
    expect(report.riskScore).toBe(90);
    expect(report.providerFindings).toEqual(expect.arrayContaining([expect.objectContaining({ source: "ThreatFox", found: true })]));
    expect(report.technicalSignals).toContain("IP address destination");
    expect(JSON.stringify(report)).not.toContain("rawContent");
    expect(report.disclaimer).toBe("Simulated response — no real system action is performed.");
  });

  it("grounds security chat answers in recorded scan evidence and asks for context when none exists", () => {
    const answer = answerGroundedSecurityQuestion({ question: "Was this URL found in threat intelligence?", scan: confirmedResult, target: "suspicious.example" });
    const noContext = answerGroundedSecurityQuestion({ question: "Is this safe?" });

    expect(answer.grounded).toBe(true);
    expect(answer.answer).toContain("ThreatFox: match found");
    expect(answer.answer).toContain("URLhaus: not found");
    expect(noContext.grounded).toBe(false);
    expect(noContext.answer).toContain("need a ShieldSense scan");
  });
});
