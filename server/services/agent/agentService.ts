import type { AgentActivity, IncidentReport, MockInboxEvent } from "@shared/agent";
import type { ScanResult } from "@shared/scan";
import { createIncidentReport, shouldGenerateIncident } from "@shared/incident";
import { runShieldSenseScan } from "../scan/scanService";
import { mockEventTarget, mockEventToScanRequest } from "./mockInbox";

export type AgentScanOutcome = {
  event: MockInboxEvent;
  result: ScanResult;
  incident?: IncidentReport;
  activity: AgentActivity[];
};

export async function processSimulatedAgentEvent(event: MockInboxEvent): Promise<AgentScanOutcome> {
  const startedAt = new Date().toISOString();
  const result = await runShieldSenseScan(mockEventToScanRequest(event));
  const incident = shouldGenerateIncident(result) ? createIncidentReport(result, mockEventTarget(event)) : undefined;
  const providerActivity = result.providers
    .filter(provider => provider.status !== "skipped")
    .map((provider, index) => ({
      id: `${result.scanId}-provider-${index}`,
      timestamp: new Date(Date.now() + index + 1).toISOString(),
      level: provider.found ? "high" as const : "info" as const,
      message: `${provider.source}: ${provider.found ? "matching threat intelligence found" : provider.status.replaceAll("_", " ")}`,
      scanId: result.scanId,
    }));
  const activity: AgentActivity[] = [
    { id: `${result.scanId}-start`, timestamp: startedAt, level: "info", message: `Scanning simulated inbox event: ${event.subject}`, scanId: result.scanId },
    ...providerActivity,
    { id: `${result.scanId}-result`, timestamp: new Date().toISOString(), level: result.riskLevel === "low" ? "safe" : result.riskLevel, message: `${result.riskLevel.toUpperCase()} RISK — ${result.simulatedResponse.label} (simulated)`, scanId: result.scanId },
  ];
  return { event, result, incident, activity };
}
