import type { IncidentReport } from "./agent";
import type { ScanResult } from "./scan";

export function shouldGenerateIncident(result: ScanResult) {
  return result.riskLevel === "high" || result.riskLevel === "critical" || result.verdict === "malicious";
}

export function createIncidentReport(result: ScanResult, target: string, createdAt = new Date().toISOString()): IncidentReport {
  return {
    incidentId: `SS-${result.scanId.replace(/-/g, "").slice(-10).toUpperCase()}`,
    createdAt,
    scanId: result.scanId,
    inputType: result.inputType,
    target: target.replace(/[^\w. ():-]/g, "_").slice(0, 180) || "Sanitized scan target",
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    verdict: result.verdict,
    providerFindings: result.providers.map(provider => ({ source: provider.source, status: provider.status, found: provider.found, description: provider.description })),
    technicalSignals: result.signals.filter(signal => signal.channel === "technical").map(signal => signal.name),
    humanSignals: result.signals.filter(signal => signal.channel === "human").map(signal => signal.name),
    fileIndicators: result.inputType === "file" ? result.signals.filter(signal => signal.source === "File metadata" || /file|extension|macro/i.test(signal.name)).map(signal => signal.name) : [],
    simulatedAction: result.simulatedResponse.label,
    recommendations: result.recommendations,
    disclaimer: "Simulated response — no real system action is performed.",
  };
}
