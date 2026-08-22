import { z } from "zod";

export const scanSourceContextSchema = z.enum(["active_tab", "selected_text", "pasted_message"]);
export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export const scanVerdictSchema = z.enum(["clear", "suspicious", "likely_phishing", "malicious"]);
export const providerStatusSchema = z.enum(["checked", "not_found", "unavailable", "skipped"]);
export const signalSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const signalChannelSchema = z.enum(["technical", "human"]);

const optionalUrlSchema = z.string().url().max(2048).optional();

export const scanRequestSchema = z
  .object({
    url: optionalUrlSchema,
    domain: z.string().trim().min(1).max(253).optional(),
    pageTitle: z.string().trim().max(300).optional(),
    selectedText: z.string().trim().min(1).max(8000).optional(),
    pastedMessage: z.string().trim().min(1).max(8000).optional(),
    sourceContext: scanSourceContextSchema,
    persistMetadata: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.url && !value.domain && !value.selectedText && !value.pastedMessage) {
      context.addIssue({ code: "custom", message: "Provide a URL, domain, selected text, or pasted message." });
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
  riskScore: z.number().int().min(0).max(100),
  riskLevel: riskLevelSchema,
  verdict: scanVerdictSchema,
  confidence: z.number().int().min(0).max(100),
  signals: z.array(threatSignalSchema),
  providers: z.array(providerResultSchema),
  recommendations: z.array(z.string().min(1).max(300)).min(1).max(4),
  privacy: z.object({ rawContentPersisted: z.literal(false), metadataPersisted: z.boolean() }),
  durationMs: z.number().int().min(0),
});

export type ScanRequest = z.infer<typeof scanRequestSchema>;
export type ThreatSignal = z.infer<typeof threatSignalSchema>;
export type ThreatIntelResult = z.infer<typeof providerResultSchema>;
export type ScanResult = z.infer<typeof scanResultSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type ScanSourceContext = z.infer<typeof scanSourceContextSchema>;

export const RISK_BANDS: ReadonlyArray<{ minimum: number; level: RiskLevel }> = [
  { minimum: 75, level: "critical" },
  { minimum: 50, level: "high" },
  { minimum: 25, level: "medium" },
  { minimum: 0, level: "low" },
];
