import type { Request, Response } from "express";
import { ZodError } from "zod";
import { runShieldSenseScan } from "../services/scan/scanService";
import { getScanRepository } from "../services/persistence/scanRepository";

type LightweightRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined>; query?: unknown };
type LightweightResponse = { status: (status: number) => LightweightResponse; json: (body: unknown) => unknown; setHeader?: (name: string, value: string) => void; end?: () => void };

function allowedOrigin(request: LightweightRequest) {
  const configured = [process.env.SHIELDSENSE_APP_ORIGIN, process.env.SHIELDSENSE_EXTENSION_ORIGIN].filter(Boolean);
  const origin = request.headers?.origin;
  const originValue = Array.isArray(origin) ? origin[0] : origin;
  if (!originValue) return configured[0] ?? "*";
  return configured.includes(originValue) ? originValue : "null";
}

export async function handleScanRequest(request: LightweightRequest, response: LightweightResponse) {
  response.setHeader?.("Access-Control-Allow-Origin", allowedOrigin(request));
  response.setHeader?.("Vary", "Origin");
  response.setHeader?.("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader?.("Access-Control-Allow-Headers", "Content-Type");
  if (request.method === "OPTIONS") {
    response.status(204);
    return response.end?.();
  }
  if (request.method !== "POST") return response.status(405).json({ error: "method_not_allowed", message: "Use POST /api/scan." });

  try {
    const result = await runShieldSenseScan(request.body);
    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({ error: "invalid_scan_request", message: "The scan request is missing required user-provided input.", issues: error.issues.map(issue => issue.message) });
    }
    console.error("[Scan] Failed to produce assessment", error);
    return response.status(500).json({ error: "scan_failed", message: "ShieldSense could not complete this scan. Try again shortly." });
  }
}

export async function handleScanHistoryRequest(request: LightweightRequest, response: LightweightResponse) {
  response.setHeader?.("Access-Control-Allow-Origin", allowedOrigin(request));
  response.setHeader?.("Vary", "Origin");
  response.setHeader?.("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (request.method === "OPTIONS") {
    response.status(204);
    return response.end?.();
  }
  if (request.method !== "GET") return response.status(405).json({ error: "method_not_allowed", message: "Use GET /api/scan-history." });
  const rawIds = request.query && typeof request.query === "object" ? (request.query as Record<string, unknown>).ids : undefined;
  const idsValue = Array.isArray(rawIds) ? rawIds.filter((value): value is string => typeof value === "string").join(",") : typeof rawIds === "string" ? rawIds : "";
  const ids = idsValue.split(",").filter(Boolean).slice(0, 12);
  try {
    return response.status(200).json({ entries: await getScanRepository().listMetadata(ids) });
  } catch {
    return response.status(200).json({ entries: [] });
  }
}

export function registerScanRoute(app: { all: (path: string, handler: (request: Request, response: Response) => unknown) => void }) {
  app.all("/api/scan", (request, response) => handleScanRequest(request, response));
  app.all("/api/scan-history", (request, response) => handleScanHistoryRequest(request, response));
}
