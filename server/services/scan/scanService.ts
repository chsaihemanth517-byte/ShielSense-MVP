import { createHash, randomUUID } from "node:crypto";
import { scanRequestSchema, type ScanRequest, type ScanResult } from "@shared/scan";
import { getScanRepository } from "../persistence/scanRepository";
import { correlateRisk } from "../risk/riskEngine";
import { runLocalHeuristics } from "../threat-intelligence/heuristics";
import { analyzeHumanManipulation } from "../threat-intelligence/llm";
import { checkThreatIntelligence } from "../threat-intelligence";

function domainFromRequest(request: ScanRequest): string | null {
  if (request.url) {
    try {
      return new URL(request.url).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
  return request.domain?.toLowerCase() ?? null;
}

function hashDomain(domain: string | null): string | null {
  return domain ? createHash("sha256").update(domain).digest("hex") : null;
}

export async function runShieldSenseScan(payload: unknown): Promise<ScanResult> {
  const request = scanRequestSchema.parse(payload);
  const startedAt = Date.now();
  const scanId = randomUUID();
  const localSignals = runLocalHeuristics(request);
  const suppliedText = [request.selectedText, request.pastedMessage].filter(Boolean).join("\n");

  const [providerResults, llmAnalysis] = await Promise.all([
    checkThreatIntelligence(request),
    analyzeHumanManipulation(suppliedText),
  ]);
  const signals = [...localSignals, ...llmAnalysis.signals];
  const providers = [...providerResults, llmAnalysis.provider];
  const preliminary = correlateRisk({
    scanId,
    signals,
    providers,
    durationMs: Date.now() - startedAt,
    metadataPersisted: false,
  });

  let metadataPersisted = false;
  if (request.persistMetadata) {
    try {
      metadataPersisted = await getScanRepository().saveMetadata({
        sourceContext: request.sourceContext,
        domainHash: hashDomain(domainFromRequest(request)),
        riskScore: preliminary.riskScore,
        riskLevel: preliminary.riskLevel,
        verdict: preliminary.verdict,
        confidence: preliminary.confidence,
        technicalSignals: signals.filter(signal => signal.channel === "technical").map(signal => signal.id),
        humanSignals: signals.filter(signal => signal.channel === "human").map(signal => signal.id),
        providerStatuses: Object.fromEntries(providers.map(provider => [provider.source, provider.status])),
        durationMs: preliminary.durationMs,
      });
    } catch {
      // Persistence is optional and intentionally must not affect the scan result.
      metadataPersisted = false;
    }
  }
  return { ...preliminary, privacy: { rawContentPersisted: false, metadataPersisted } };
}
