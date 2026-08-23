import { z } from "zod";
import { fileMetadataSchema, scanResultSchema, scanSourceContextSchema } from "./scan.js";

export const mockInboxEventSchema = z.object({
  id: z.string().min(1).max(64),
  sender: z.string().min(1).max(180),
  subject: z.string().min(1).max(220),
  body: z.string().min(1).max(3000),
  timestampLabel: z.string().min(1).max(48),
  url: z.string().url().max(2048).optional(),
  file: fileMetadataSchema.optional(),
  sourceContext: scanSourceContextSchema,
});

export const agentStateSchema = z.enum(["stopped", "active", "paused"]);
export const agentActivitySchema = z.object({
  id: z.string().min(1).max(128),
  timestamp: z.string().datetime({ offset: true }),
  level: z.enum(["info", "safe", "medium", "high", "critical"]),
  message: z.string().min(1).max(240),
  scanId: z.string().uuid().optional(),
});

export const incidentReportSchema = z.object({
  incidentId: z.string().regex(/^SS-[A-Z0-9-]{8,40}$/),
  createdAt: z.string().datetime({ offset: true }),
  scanId: z.string().uuid(),
  inputType: z.enum(["url", "file", "message"]),
  target: z.string().min(1).max(180),
  riskScore: z.number().int().min(0).max(100),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  verdict: z.enum(["clear", "suspicious", "likely_phishing", "malicious"]),
  providerFindings: z.array(z.object({ source: z.string(), status: z.string(), found: z.boolean(), description: z.string().optional() })),
  technicalSignals: z.array(z.string()),
  humanSignals: z.array(z.string()),
  fileIndicators: z.array(z.string()),
  simulatedAction: z.string(),
  recommendations: z.array(z.string()),
  disclaimer: z.literal("Simulated response — no real system action is performed."),
});

export const securityChatRequestSchema = z.object({
  question: z.string().trim().min(1).max(1200),
  scan: scanResultSchema.optional(),
  target: z.string().trim().min(1).max(180).optional(),
});

export const securityChatResponseSchema = z.object({
  answer: z.string().min(1).max(3000),
  grounded: z.boolean(),
  scanId: z.string().uuid().optional(),
});

export type MockInboxEvent = z.infer<typeof mockInboxEventSchema>;
export type AgentState = z.infer<typeof agentStateSchema>;
export type AgentActivity = z.infer<typeof agentActivitySchema>;
export type IncidentReport = z.infer<typeof incidentReportSchema>;
export type SecurityChatRequest = z.infer<typeof securityChatRequestSchema>;
export type SecurityChatResponse = z.infer<typeof securityChatResponseSchema>;
