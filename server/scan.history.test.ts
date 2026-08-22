import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseScanRepository } from "./services/persistence/scanRepository";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("privacy-safe scan history repository", () => {
  it("writes only summary metadata and omits raw input fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;
    const repository = new SupabaseScanRepository("https://supabase.example", "test-key");

    await repository.saveMetadata({
      scanId: "ad6dcc15-13d9-4f77-b0b8-ed3e5bcf4321",
      sourceContext: "hero_message",
      inputType: "message",
      inputIdentifier: "Pasted message",
      domainHash: null,
      fileHash: null,
      riskScore: 25,
      riskLevel: "medium",
      verdict: "suspicious",
      confidence: 40,
      technicalSignals: [],
      humanSignals: ["urgency_language"],
      providerStatuses: { URLhaus: "skipped" },
      responseAction: "warn",
      durationMs: 16,
    });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(body).toMatchObject({ input_identifier: "Pasted message", response_action: "warn" });
    expect(body).not.toHaveProperty("url");
    expect(body).not.toHaveProperty("pastedMessage");
    expect(body).not.toHaveProperty("file_content");
  });

  it("requests only caller-known scan IDs in newest-first order and maps safe display fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        scan_id: "ad6dcc15-13d9-4f77-b0b8-ed3e5bcf4321",
        created_at: "2026-08-23T12:00:00+00:00",
        input_type: "file",
        input_identifier: "invoice.pdf",
        file_hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        risk_score: 25,
        risk_level: "medium",
        verdict: "suspicious",
        response_action: "warn",
      }],
    });
    global.fetch = fetchMock as typeof fetch;
    const repository = new SupabaseScanRepository("https://supabase.example", "test-key");

    const entries = await repository.listMetadata(["ad6dcc15-13d9-4f77-b0b8-ed3e5bcf4321", "not-a-uuid"]);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("scan_id=in.");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("order=created_at.desc");
    expect(entries).toEqual([expect.objectContaining({ inputIdentifier: "invoice.pdf", fileHashPrefix: "0123456789ab", responseAction: "warn" })]);
  });
});
