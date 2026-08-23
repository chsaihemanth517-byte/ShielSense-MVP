import { scanHistoryEntrySchema, type ScanHistoryEntry, type ScanResult, type ScanSourceContext } from "../../../shared/scan.js";

export type ScanMetadataRecord = {
  scanId: string;
  sourceContext: ScanSourceContext;
  inputType: ScanHistoryEntry["inputType"];
  inputIdentifier: string;
  domainHash: string | null;
  fileHash: string | null;
  riskScore: number;
  riskLevel: ScanResult["riskLevel"];
  verdict: ScanResult["verdict"];
  confidence: number;
  technicalSignals: string[];
  humanSignals: string[];
  providerStatuses: Record<string, string>;
  responseAction: ScanHistoryEntry["responseAction"];
  durationMs: number;
};

export interface ScanRepository {
  saveMetadata(record: ScanMetadataRecord): Promise<boolean>;
  listMetadata(scanIds: string[]): Promise<ScanHistoryEntry[]>;
}

export class NoopScanRepository implements ScanRepository {
  async saveMetadata(): Promise<boolean> {
    return false;
  }

  async listMetadata(): Promise<ScanHistoryEntry[]> {
    return [];
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
        scan_id: record.scanId,
        source_context: record.sourceContext,
        input_type: record.inputType,
        input_identifier: record.inputIdentifier,
        domain_hash: record.domainHash,
        file_hash: record.fileHash,
        risk_score: record.riskScore,
        risk_level: record.riskLevel,
        verdict: record.verdict,
        confidence: record.confidence,
        technical_signals: record.technicalSignals,
        human_signals: record.humanSignals,
        provider_statuses: record.providerStatuses,
        response_action: record.responseAction,
        duration_ms: record.durationMs,
      }),
      signal: AbortSignal.timeout(3500),
    });

    return response.ok;
  }

  async listMetadata(scanIds: string[]): Promise<ScanHistoryEntry[]> {
    const uniqueIds = scanIds.filter((id, index) => scanIds.indexOf(id) === index && /^[a-f0-9-]{36}$/i.test(id)).slice(0, 12);
    if (!uniqueIds.length) return [];
    const select = "scan_id,created_at,input_type,input_identifier,file_hash,risk_score,risk_level,verdict,response_action";
    const idFilter = `in.(${uniqueIds.join(",")})`;
    const params = new URLSearchParams({ select, scan_id: idFilter, order: "created_at.desc" });
    const response = await fetch(`${this.url.replace(/\/$/, "")}/rest/v1/scan_metadata?${params}`, {
      headers: { apikey: this.serviceRoleKey, Authorization: `Bearer ${this.serviceRoleKey}` },
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return [];
    const rows = (await response.json()) as Array<Record<string, unknown>>;
    return scanHistoryEntrySchema.array().parse(rows.map(row => ({
      scanId: row.scan_id,
      createdAt: row.created_at,
      inputType: row.input_type,
      inputIdentifier: row.input_identifier || (row.input_type === "file" ? "Selected file" : row.input_type === "message" ? "Pasted message" : "Submitted link"),
      fileHashPrefix: typeof row.file_hash === "string" ? row.file_hash.slice(0, 12) : undefined,
      riskScore: row.risk_score,
      riskLevel: row.risk_level,
      verdict: row.verdict,
      responseAction: row.response_action,
    })));
  }
}

export function getScanRepository(): ScanRepository {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return new NoopScanRepository();
  return new SupabaseScanRepository(url, serviceRoleKey);
}
