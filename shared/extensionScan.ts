import { z } from "zod";

/**
 * Public, privacy-minimised event contract shared by the browser extension
 * and the ShieldSense page. It deliberately excludes raw URLs, message text,
 * sender identities, and page content.
 */
export const scanPhaseSchema = z.enum(["scan_started", "analysis_update", "scan_complete"]);
export const scanVerdictSchema = z.enum(["unknown", "clear", "elevated", "critical"]);
export const signalIndicatorSchema = z.enum([
  "recent_domain",
  "redirect_chain",
  "identity_mismatch",
  "lookalike_domain",
  "urgency",
  "impersonation",
  "authority_pressure",
  "credential_request",
]);

const signalSummarySchema = z
  .object({
    technical: z.array(signalIndicatorSchema).max(4).default([]),
    human: z.array(signalIndicatorSchema).max(4).default([]),
  })
  .strict();

export const extensionScanEventSchema = z
  .object({
    type: z.literal("SHIELDSENSE_SCAN_EVENT"),
    version: z.literal(1),
    sessionId: z.string().min(16).max(128),
    scanId: z.string().min(8).max(128),
    phase: scanPhaseSchema,
    verdict: scanVerdictSchema,
    signals: signalSummarySchema,
    timestamp: z.number().int().positive(),
  })
  .strict();

export type ExtensionScanEvent = z.infer<typeof extensionScanEventSchema>;
export type ScanPhase = z.infer<typeof scanPhaseSchema>;
export type ScanVerdict = z.infer<typeof scanVerdictSchema>;
export type ScanConnectionState = "waiting" | "scanning" | "complete" | "unavailable";
export type ScanSceneMode = "coherent" | "beam" | "split" | "resolve";

export function sceneModeForScan(state: ScanConnectionState, event: ExtensionScanEvent | null): ScanSceneMode {
  if (state === "scanning") return "beam";
  if (state === "complete" && event?.verdict === "clear") return "resolve";
  if (state === "complete" && (event?.verdict === "elevated" || event?.verdict === "critical")) return "split";
  return "coherent";
}

export const extensionReadyEventSchema = z
  .object({
    type: z.literal("SHIELDSENSE_PAGE_READY"),
    version: z.literal(1),
    sessionId: z.string().min(16).max(128),
  })
  .strict();

export type ExtensionReadyEvent = z.infer<typeof extensionReadyEventSchema>;
