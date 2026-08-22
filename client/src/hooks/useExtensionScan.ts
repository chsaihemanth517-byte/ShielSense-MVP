import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SignalMode } from "@/components/CinematicSignalField";
import { extensionScanEventSchema, sceneModeForScan, type ExtensionScanEvent, type ScanConnectionState, type ScanVerdict } from "@shared/extensionScan";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().replaceAll("-", "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`;
}

export function useExtensionScan() {
  const [sessionId] = useState(createSessionId);
  const [event, setEvent] = useState<ExtensionScanEvent | null>(null);
  const [connectionState, setConnectionState] = useState<ScanConnectionState>("waiting");
  const requestTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let debugStartTimer: number | null = null;
    let debugCompleteTimer: number | null = null;
    const announcePageReady = () => {
      window.postMessage(
        { type: "SHIELDSENSE_PAGE_READY", version: 1, sessionId },
        window.location.origin,
      );
    };

    const handleMessage = (message: MessageEvent<unknown>) => {
      if (message.source !== window || message.origin !== window.location.origin) return;
      const parsed = extensionScanEventSchema.safeParse(message.data);
      if (!parsed.success || parsed.data.sessionId !== sessionId) return;

      if (requestTimeoutRef.current !== null) {
        window.clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      setEvent(parsed.data);
      setConnectionState(parsed.data.phase === "scan_complete" ? "complete" : "scanning");
    };

    const unavailableTimer = window.setTimeout(() => {
      setConnectionState(current => (current === "waiting" ? "unavailable" : current));
    }, 2500);

    announcePageReady();
    const debugScenario = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("scanBridgeTest") : null;
    if (debugScenario === "clear" || debugScenario === "elevated") {
      const scanId = `test_scan_${sessionId.slice(0, 20)}`;
      debugStartTimer = window.setTimeout(() => {
        window.postMessage(
          {
            type: "SHIELDSENSE_SCAN_EVENT",
            version: 1,
            sessionId,
            scanId,
            phase: "scan_started",
            verdict: "unknown",
            signals: { technical: [], human: [] },
            timestamp: Date.now(),
          },
          window.location.origin,
        );
      }, 60);
      debugCompleteTimer = window.setTimeout(() => {
        window.postMessage(
          {
            type: "SHIELDSENSE_SCAN_EVENT",
            version: 1,
            sessionId,
            scanId,
            phase: "scan_complete",
            verdict: debugScenario,
            signals:
              debugScenario === "clear"
                ? { technical: [], human: [] }
                : { technical: ["recent_domain", "redirect_chain"], human: ["urgency", "impersonation"] },
            timestamp: Date.now(),
          },
          window.location.origin,
        );
      }, 900);
    }
    window.addEventListener("message", handleMessage);
    return () => {
      window.clearTimeout(unavailableTimer);
      if (debugStartTimer !== null) window.clearTimeout(debugStartTimer);
      if (debugCompleteTimer !== null) window.clearTimeout(debugCompleteTimer);
      if (requestTimeoutRef.current !== null) window.clearTimeout(requestTimeoutRef.current);
      window.removeEventListener("message", handleMessage);
    };
  }, [sessionId]);

  const requestScan = useCallback(() => {
    if (requestTimeoutRef.current !== null) window.clearTimeout(requestTimeoutRef.current);
    setConnectionState("scanning");
    window.postMessage(
      { type: "SHIELDSENSE_SCAN_REQUEST", version: 1, sessionId, requestedAt: Date.now() },
      window.location.origin,
    );
    requestTimeoutRef.current = window.setTimeout(() => {
      setConnectionState(current => (current === "scanning" ? "unavailable" : current));
      requestTimeoutRef.current = null;
    }, 3200);
  }, [sessionId]);

  return useMemo(
    () => ({
      connectionState,
      event,
      requestScan,
      sceneMode: sceneModeForScan(connectionState, event) as SignalMode,
      verdict: event?.verdict ?? ("unknown" as ScanVerdict),
      technicalSignals: event?.signals.technical ?? [],
      humanSignals: event?.signals.human ?? [],
    }),
    [connectionState, event, requestScan],
  );
}
