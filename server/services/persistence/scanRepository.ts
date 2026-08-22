import type { ScanResult, ScanSourceContext } from "@shared/scan";

export type ScanMetadataRecord = {
  sourceContext: ScanSourceContext;
  domainHash: string | null;
  riskScore: number;
  riskLevel: ScanResult["riskLevel"];
  verdict: ScanResult["verdict"];
  confidence: number;
  technicalSignals: string[];
  humanSignals: string[];
  providerStatuses: Record<string, string>;
  durationMs: number;
};

export interface ScanRepository {
  saveMetadata(record: ScanMetadataRecord): Promise<boolean>;
}

export class NoopScanRepository implements ScanRepository {
  async saveMetadata(): Promise<boolean> {
    return false;
  }
}

export class SupabaseScanRepository implements ScanRepository {
  constructor(
    private readonly url: string,
    private readonly serviceRoleKey: string,
  ) {}

  async saveMetadata(record: ScanMetadataRecord): Promise<boolean> {
    const response = await fetch(`${this.url.replace(/\/$/, "")}/rest/v1/scan_metadata`, {
      method: "POST",
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        source_context: record.sourceContext,
        domain_hash: record.domainHash,
        risk_score: record.riskScore,
        risk_level: record.riskLevel,
        verdict: record.verdict,
        confidence: record.confidence,
        technical_signals: record.technicalSignals,
        human_signals: record.humanSignals,
        provider_statuses: record.providerStatuses,
        duration_ms: record.durationMs,
      }),
      signal: AbortSignal.timeout(3500),
    });

    return response.ok;
  }
}

export function getScanRepository(): ScanRepository {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return new NoopScanRepository();
  return new SupabaseScanRepository(url, serviceRoleKey);
}
