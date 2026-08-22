import { z } from "zod";

export const scanSourceContextSchema = z.enum(["active_tab", "selected_text", "pasted_message", "hero_url", "hero_file", "hero_message"]);
export const scanInputTypeSchema = z.enum(["url", "file", "message"]);
export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export const scanVerdictSchema = z.enum(["clear", "suspicious", "likely_phishing", "malicious"]);
export const simulatedResponseActionSchema = z.enum(["allow", "warn", "block", "quarantine"]);
export const providerStatusSchema = z.enum(["checked", "not_found", "unavailable", "skipped"]);
export const signalSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const signalChannelSchema = z.enum(["technical", "human"]);

const optionalUrlSchema = z.string().url().max(2048).optional();
export const fileMetadataSchema = z.object({
  name: z.string().trim().min(1).max(180),
  size: z.number().int().min(0).max(10 * 1024 * 1024),
  mimeType: z.string().trim().min(1).max(128),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, "Expected a SHA-256 hash.").optional(),
});

export const scanRequestSchema = z
  .object({
    url: optionalUrlSchema,
    domain: z.string().trim().min(1).max(253).optional(),
    pageTitle: z.string().trim().max(300).optional(),
    selectedText: z.string().trim().min(1).max(8000).optional(),
    pastedMessage: z.string().trim().min(1).max(8000).optional(),
    file: fileMetadataSchema.optional(),
    sourceContext: scanSourceContextSchema,
    persistMetadata: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.url && !value.domain && !value.selectedText && !value.pastedMessage && !value.file) {
      context.addIssue({ code: "custom", message: "Provide a URL, domain, selected text, pasted message, or file metadata." });
    }
    if (value.sourceContext === "active_tab" && !value.url && !value.domain) {
      context.addIssue({ code: "custom", message: "An active-tab scan requires a URL or domain." });
    }
    if (value.sourceContext === "selected_text" && !value.selectedText) {
      context.addIssue({ code: "custom", message: "A selected-text scan requires selected text." });
    }
    if (value.sourceContext === "pasted_message" && !value.pastedMessage) {
      context.addIssue({ code: "custom", message: "A pasted-message scan requires pasted message text." });
    }
    if (value.sourceContext === "hero_url" && !value.url) context.addIssue({ code: "custom", message: "A link scan requires a valid URL." });
    if (value.sourceContext === "hero_file" && !value.file) context.addIssue({ code: "custom", message: "A file scan requires safe file metadata." });
    if (value.sourceContext === "hero_message" && !value.pastedMessage) context.addIssue({ code: "custom", message: "A message scan requires pasted message text." });
  });

export const threatSignalSchema = z.object({
  id: z.string().min(1).max(128),
  channel: signalChannelSchema,
  source: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  severity: signalSeveritySchema,
  description: z.string().min(1).max(500),
  evidence: z.string().max(500).optional(),
  weight: z.number().int().min(0).max(100),
});

export const providerResultSchema = z.object({
  source: z.string().min(1).max(64),
  status: providerStatusSchema,
  found: z.boolean(),
  severity: signalSeveritySchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  description: z.string().max(500).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  errorCode: z.string().max(64).optional(),
});

export const scanResultSchema = z.object({
  scanId: z.string().min(8).max(128),
  inputType: scanInputTypeSchema,
  riskScore: z.number().int().min(0).max(100),
  riskLevel: riskLevelSchema,
  verdict: scanVerdictSchema,
  confidence: z.number().int().min(0).max(100),
  signals: z.array(threatSignalSchema),
  providers: z.array(providerResultSchema),
  recommendations: z.array(z.string().min(1).max(300)).min(1).max(4),
  explanation: z.string().min(1).max(600),
  simulatedResponse: z.object({
    action: simulatedResponseActionSchema,
    label: z.string().min(1).max(32),
    disclaimer: z.literal("Simulated response — no real system action is performed."),
  }),
  privacy: z.object({ rawContentPersisted: z.literal(false), metadataPersisted: z.boolean() }),
  durationMs: z.number().int().min(0),
});

export const scanHistoryEntrySchema = z.object({
  scanId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  inputType: scanInputTypeSchema,
  inputIdentifier: z.string().min(1).max(180),
  fileHashPrefix: z.string().regex(/^[a-f0-9]{12}$/i).optional(),
  riskScore: z.number().int().min(0).max(100),
  riskLevel: riskLevelSchema,
  verdict: scanVerdictSchema,
  responseAction: simulatedResponseActionSchema,
});

export type ScanRequest = z.infer<typeof scanRequestSchema>;
export type ThreatSignal = z.infer<typeof threatSignalSchema>;
export type ThreatIntelResult = z.infer<typeof providerResultSchema>;
export type ScanResult = z.infer<typeof scanResultSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type ScanSourceContext = z.infer<typeof scanSourceContextSchema>;
export type ScanInputType = z.infer<typeof scanInputTypeSchema>;
export type FileMetadata = z.infer<typeof fileMetadataSchema>;
export type SimulatedResponseAction = z.infer<typeof simulatedResponseActionSchema>;
export type ScanHistoryEntry = z.infer<typeof scanHistoryEntrySchema>;

export const RISK_BANDS: ReadonlyArray<{ minimum: number; level: RiskLevel }> = [
  { minimum: 75, level: "critical" },
  { minimum: 50, level: "high" },
  { minimum: 25, level: "medium" },
  { minimum: 0, level: "low" },
];
