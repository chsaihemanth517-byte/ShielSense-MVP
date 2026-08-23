import { RISK_BANDS, type RiskLevel, type ScanInputType, type ScanResult, type SimulatedResponseAction, type ThreatIntelResult, type ThreatSignal } from "../../../shared/scan";

const PROVIDER_WEIGHTS: Record<NonNullable<ThreatIntelResult["severity"]>, number> = {
  low: 8,
  medium: 18,
  high: 35,
  critical: 55,
};

function levelFor(score: number): RiskLevel {
  return RISK_BANDS.find(band => score >= band.minimum)?.level ?? "low";
}

function recommendationFor(level: RiskLevel): string[] {
  if (level === "critical") return ["Do not open the link or attachment.", "Verify the request through a known independent channel.", "Report the message through your organization’s security process."];
  if (level === "high") return ["Pause before taking action.", "Verify the sender and destination through a known independent channel.", "Avoid entering credentials or payment information from this message."];
  if (level === "medium") return ["Review the destination and sender carefully before proceeding.", "Use a known bookmark or contact method to verify the request."];
  return ["No elevated risk was found from the available signals.", "Continue normal verification habits if the context changes."];
}

function simulatedResponseFor(level: RiskLevel, verdict: ScanResult["verdict"]): { action: SimulatedResponseAction; label: string } {
  if (verdict === "malicious" || level === "critical") return { action: "quarantine", label: "QUARANTINE" };
  if (level === "high") return { action: "block", label: "BLOCK" };
  if (level === "medium") return { action: "warn", label: "WARN USER" };
  return { action: "allow", label: "ALLOW" };
}

function explanationFor(inputType: ScanInputType, riskLevel: RiskLevel, signals: ThreatSignal[], providers: ThreatIntelResult[]) {
  const inputLabel = inputType === "file" ? "static file metadata" : inputType === "message" ? "the pasted message" : "the submitted link";
  const foundSources = providers.filter(provider => provider.found).length;
  if (riskLevel === "low") return `No elevated signals were found from ${inputLabel}. This reflects the available checks, not a guarantee of safety.`;
  const signalLabel = `${signals.length} local ${signals.length === 1 ? "signal" : "signals"}`;
  const sourceLabel = foundSources ? ` and ${foundSources} matching threat-intelligence ${foundSources === 1 ? "source" : "sources"}` : "";
  return `ShieldSense found ${signalLabel}${sourceLabel} while reading ${inputLabel}. Review the evidence before proceeding.`;
}

export function correlateRisk(input: { scanId: string; inputType?: ScanInputType; signals: ThreatSignal[]; providers: ThreatIntelResult[]; durationMs: number; metadataPersisted: boolean }): ScanResult {
  const localWeight = input.signals.reduce((sum, signal) => sum + signal.weight, 0);
  const providerWeight = input.providers.reduce((sum, provider) => sum + (provider.found && provider.severity ? PROVIDER_WEIGHTS[provider.severity] : 0), 0);
  const hasTwoChannelEvidence = new Set(input.signals.map(signal => signal.channel)).size === 2;
  const correlationBonus = hasTwoChannelEvidence ? 10 : 0;
  const riskScore = Math.min(100, localWeight + providerWeight + correlationBonus);
  const riskLevel = levelFor(riskScore);
  const confirmedMalicious = input.providers.some(provider => provider.found && (provider.severity === "critical" || provider.severity === "high"));
  const verdict = confirmedMalicious ? "malicious" : riskLevel === "high" || riskLevel === "critical" ? "likely_phishing" : riskLevel === "medium" ? "suspicious" : "clear";
  const checkedProviders = input.providers.filter(provider => provider.status === "checked" || provider.status === "not_found").length;
  const confidence = Math.min(100, 30 + Math.min(35, input.signals.length * 8) + Math.min(25, checkedProviders * 8) + (hasTwoChannelEvidence ? 10 : 0));
  const inputType = input.inputType ?? "url";
  const simulatedResponse = simulatedResponseFor(riskLevel, verdict);

  return {
    scanId: input.scanId,
    inputType,
    riskScore,
    riskLevel,
    verdict,
    confidence,
    signals: input.signals,
    providers: input.providers,
    recommendations: recommendationFor(riskLevel),
    explanation: explanationFor(inputType, riskLevel, input.signals, input.providers),
    simulatedResponse: { ...simulatedResponse, disclaimer: "Simulated response — no real system action is performed." },
    privacy: { rawContentPersisted: false, metadataPersisted: input.metadataPersisted },
    durationMs: input.durationMs,
  };
}
