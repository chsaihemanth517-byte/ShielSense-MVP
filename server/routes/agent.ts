import type { Request, Response } from "express";
import { ZodError } from "zod";
import { getMockInboxEvent } from "../services/agent/mockInbox";
import { processSimulatedAgentEvent } from "../services/agent/agentService";
import { answerGroundedSecurityQuestion } from "../services/chat/securityChat";
import { securityChatRequestSchema } from "@shared/agent";

type LightweightRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type LightweightResponse = { status: (status: number) => LightweightResponse; json: (body: unknown) => unknown; setHeader?: (name: string, value: string) => void; end?: () => void };

function setCors(request: LightweightRequest, response: LightweightResponse) {
  const configured = [process.env.SHIELDSENSE_APP_ORIGIN, process.env.SHIELDSENSE_EXTENSION_ORIGIN].filter(Boolean);
  const rawOrigin = request.headers?.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
  response.setHeader?.("Access-Control-Allow-Origin", origin && configured.includes(origin) ? origin : configured[0] ?? "*");
  response.setHeader?.("Vary", "Origin");
  response.setHeader?.("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader?.("Access-Control-Allow-Headers", "Content-Type");
}

function isOptions(request: LightweightRequest, response: LightweightResponse) {
  setCors(request, response);
  if (request.method !== "OPTIONS") return false;
  response.status(204);
  response.end?.();
  return true;
}

export async function handleAgentScanRequest(request: LightweightRequest, response: LightweightResponse) {
  if (isOptions(request, response)) return;
  if (request.method !== "POST") return response.status(405).json({ error: "method_not_allowed", message: "Use POST /api/agent/scan." });
  const eventId = request.body && typeof request.body === "object" ? (request.body as { eventId?: unknown }).eventId : undefined;
  const event = typeof eventId === "string" ? getMockInboxEvent(eventId) : undefined;
  if (!event) return response.status(400).json({ error: "invalid_mock_event", message: "Choose a controlled mock inbox event." });
  try {
    return response.status(200).json(await processSimulatedAgentEvent(event));
  } catch (error) {
    console.error("[Agent] Simulated event scan failed", error);
    return response.status(500).json({ error: "agent_scan_failed", message: "ShieldSense could not scan the simulated event." });
  }
}

export async function handleSecurityChatRequest(request: LightweightRequest, response: LightweightResponse) {
  if (isOptions(request, response)) return;
  if (request.method !== "POST") return response.status(405).json({ error: "method_not_allowed", message: "Use POST /api/chat." });
  try {
    return response.status(200).json(answerGroundedSecurityQuestion(securityChatRequestSchema.parse(request.body)));
  } catch (error) {
    if (error instanceof ZodError) return response.status(400).json({ error: "invalid_chat_request", message: "Ask a question and optionally include a completed ShieldSense scan." });
    return response.status(500).json({ error: "chat_failed", message: "ShieldSense could not prepare a grounded answer." });
  }
}

export function registerAgentRoutes(app: { all: (path: string, handler: (request: Request, response: Response) => unknown) => void }) {
  app.all("/api/agent/scan", (request, response) => handleAgentScanRequest(request, response));
  app.all("/api/chat", (request, response) => handleSecurityChatRequest(request, response));
}
