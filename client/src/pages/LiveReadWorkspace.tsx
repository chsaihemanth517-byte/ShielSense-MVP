import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ArrowLeft, Check, CircleAlert, FileUp, LoaderCircle, Paperclip, SendHorizontal, ShieldCheck, X } from "lucide-react";
import { CinematicSignalField, type SignalMode } from "@/components/CinematicSignalField";
import type { ScanHistoryEntry, ScanResult } from "@shared/scan";

const HISTORY_STORAGE_KEY = "shieldsense.hero-scan-ids.v1";

function displayTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Just now" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function displaySize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.ceil(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function progressFor(fileAttached: boolean) {
  return fileAttached
    ? ["VALIDATING METADATA", "STATIC FILE SIGNALS", "READING MESSAGE CONTEXT", "RISK ASSESSMENT"]
    : ["VALIDATING MESSAGE", "HUMAN-SIGNAL HEURISTICS", "CORRELATING SIGNALS", "RISK ASSESSMENT"];
}

function modeFor(stage: "ready" | "scanning" | "complete" | "error", result: ScanResult | null): SignalMode {
  if (stage === "scanning") return "beam";
  if (stage === "complete") return result?.riskLevel === "low" ? "resolve" : "split";
  return "coherent";
}

async function hashFileLocally(file: File) {
  if (!window.crypto?.subtle) return undefined;
  const data = await file.arrayBuffer();
  const hash = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("");
}

function localHistoryEntry(result: ScanResult, inputIdentifier: string): ScanHistoryEntry {
  return {
    scanId: result.scanId,
    createdAt: new Date().toISOString(),
    inputType: result.inputType,
    inputIdentifier,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    verdict: result.verdict,
    responseAction: result.simulatedResponse.action,
  };
}

export default function LiveReadWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string | undefined>();
  const [hashState, setHashState] = useState<"idle" | "reading" | "ready" | "unavailable">("idle");
  const [stage, setStage] = useState<"ready" | "scanning" | "complete" | "error">("ready");
  const [progressIndex, setProgressIndex] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(HISTORY_STORAGE_KEY);
    const ids = stored ? stored.split(",").filter(id => /^[a-f0-9-]{36}$/i.test(id)).slice(0, 8) : [];
    if (!ids.length) return;
    void fetch(`/api/scan-history?ids=${encodeURIComponent(ids.join(","))}`)
      .then(response => response.ok ? response.json() as Promise<{ entries?: ScanHistoryEntry[] }> : { entries: [] })
      .then(payload => setHistory(payload.entries ?? []))
      .catch(() => undefined);
  }, []);

  const refreshHistory = async (scanResult: ScanResult, identifier: string) => {
    const localEntry = localHistoryEntry(scanResult, identifier);
    setHistory(current => [localEntry, ...current.filter(entry => entry.scanId !== scanResult.scanId)].slice(0, 8));
    const existing = window.sessionStorage.getItem(HISTORY_STORAGE_KEY)?.split(",").filter(Boolean) ?? [];
    const ids = [scanResult.scanId, ...existing.filter(id => id !== scanResult.scanId)].slice(0, 8);
    window.sessionStorage.setItem(HISTORY_STORAGE_KEY, ids.join(","));
    if (!scanResult.privacy.metadataPersisted) return;
    try {
      const response = await fetch(`/api/scan-history?ids=${encodeURIComponent(ids.join(","))}`);
      const payload = await response.json() as { entries?: ScanHistoryEntry[] };
      if (response.ok && payload.entries?.length) setHistory(payload.entries);
    } catch {
      // The current browser-session entry remains available if history refresh is unavailable.
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setFileHash(undefined);
    setResult(null);
    setError(null);
    setStage("ready");
    if (!nextFile) {
      setHashState("idle");
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setHashState("unavailable");
      setError("Choose a file no larger than 10 MB. ShieldSense analyzes static metadata only.");
      return;
    }
    setHashState("reading");
    try {
      const hash = await hashFileLocally(nextFile);
      setFileHash(hash);
      setHashState(hash ? "ready" : "unavailable");
    } catch {
      setHashState("unavailable");
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileHash(undefined);
    setHashState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitRead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedText = text.trim();
    if (!normalizedText && !file) {
      setStage("error");
      setError("Paste a message, attach a file, or include both before beginning a live reading.");
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setStage("error");
      setError("Choose a file no larger than 10 MB.");
      return;
    }
    setError(null);
    setResult(null);
    setSubmittedText(normalizedText);
    setStage("scanning");
    setProgressIndex(0);
    const steps = progressFor(Boolean(file));
    const timer = window.setInterval(() => setProgressIndex(current => Math.min(current + 1, steps.length - 1)), 420);
    const sanitizedFileName = file?.name.replace(/[^\w. ()-]/g, "_").slice(0, 180) || "Selected file";
    const inputIdentifier = file ? sanitizedFileName : "Pasted message";
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedMessage: normalizedText || undefined,
          file: file ? { name: sanitizedFileName, size: file.size, mimeType: file.type || "application/octet-stream", sha256: fileHash } : undefined,
          sourceContext: file ? "hero_file" : "hero_message",
          persistMetadata: true,
        }),
      });
      const payload = await response.json() as ScanResult | { message?: string };
      if (!response.ok || !("riskScore" in payload)) throw new Error("message" in payload ? payload.message : "The analysis service did not return a valid result.");
      setResult(payload);
      setProgressIndex(steps.length - 1);
      setStage("complete");
      void refreshHistory(payload, inputIdentifier);
    } catch (scanError) {
      setStage("error");
      setError(scanError instanceof Error ? scanError.message : "ShieldSense could not complete this read. Please try again.");
    } finally {
      window.clearInterval(timer);
    }
  };

  const technicalSignals = result?.signals.filter(signal => signal.channel === "technical") ?? [];
  const humanSignals = result?.signals.filter(signal => signal.channel === "human") ?? [];

  return (
    <main className="live-read">
      <header className="live-read__header">
        <a className="brand" href="/" aria-label="Return to ShieldSense home"><span className="brand__mark" aria-hidden="true"><span /><span /></span><span>SHIELDSENSE</span></a>
        <div className="live-read__header-meta"><span>LIVE READING</span><span>EXPLICIT INPUT ONLY</span></div>
        <a className="live-read__back" href="/"><ArrowLeft size={14} aria-hidden="true" /> Product site</a>
      </header>

      <section className="live-read__workspace" aria-label="ShieldSense live reading workspace">
        <aside className="live-read__history" aria-label="Recent privacy-safe scan history">
          <div className="live-read__rail-head"><p>[ RECENT READS ]</p><span>PRIVATE TO THIS BROWSER</span></div>
          <div className="live-read__history-list">
            {history.length ? history.map(entry => (
              <article key={entry.scanId} className={`live-read__history-item live-read__history-item--${entry.riskLevel}`}>
                <div><span>{entry.inputType.toUpperCase()}</span><time>{displayTime(entry.createdAt)}</time></div>
                <strong>{entry.inputIdentifier}</strong>
                <p>{entry.riskLevel.toUpperCase()} · {entry.verdict.replaceAll("_", " ")}</p>
                <em>{entry.riskScore}/100 · {entry.responseAction.toUpperCase()}</em>
              </article>
            )) : <div className="live-read__history-empty"><ShieldCheck size={19} /><p>Completed reads appear here. Raw messages and files never do.</p></div>}
          </div>
          <p className="live-read__rail-note"><span>●</span> Uses scan IDs known to this browser; no global activity feed is exposed.</p>
        </aside>

        <section className="live-read__main">
          <div className="live-read__intro"><p>[ TWO-CHANNEL ANALYSIS ]</p><h1>Read the request.<br /><em>Keep the context.</em></h1><span>Paste a message, attach a file, or do both. ShieldSense reads explicit input only.</span></div>
          <div className={`live-read__conversation live-read__conversation--${stage}`}>
            <div className="live-read__field" aria-hidden="true"><CinematicSignalField mode={modeFor(stage, result)} /></div>
            {stage === "ready" && <div className="live-read__empty"><div><span>01</span><b>Attach safely</b><p>Metadata stays local. Files are never opened or executed.</p></div><div><span>02</span><b>Paste context</b><p>Human-pressure signals need the words around the request.</p></div><div><span>03</span><b>Read the evidence</b><p>Get clear reasoning and a simulated next action.</p></div></div>}
            {(stage === "scanning" || stage === "complete" || stage === "error") && <div className="live-read__thread">
              {(submittedText || file) && <div className="live-read__user-bubble"><p>{submittedText || "File metadata request"}</p>{file && <span><Paperclip size={12} /> {file.name} · {displaySize(file.size)}</span>}</div>}
              {stage === "scanning" && <div className="live-read__scanning" role="status" aria-live="polite"><LoaderCircle className="demo-spin" size={18} /><div>{progressFor(Boolean(file)).map((item, index) => <span key={item} className={index <= progressIndex ? "is-active" : undefined}>{index === progressIndex ? "●" : "○"} {item}</span>)}</div></div>}
              {stage === "error" && <div className="live-read__error" role="alert"><CircleAlert size={18} /><p>{error}</p></div>}
              {stage === "complete" && result && <article className={`live-read__result live-read__result--${result.riskLevel}`} aria-live="polite"><div className="live-read__score"><span>[ RISK READ ]</span><strong>{result.riskScore}<small>/100</small></strong><p>{result.riskLevel.toUpperCase()} · {result.verdict.replaceAll("_", " ")}</p></div><div className="live-read__result-copy"><span className={`live-read__action live-read__action--${result.simulatedResponse.action}`}>SIMULATED · {result.simulatedResponse.label}</span><p>{result.explanation}</p><div className="live-read__evidence"><section><b>TECHNICAL</b>{technicalSignals.length ? technicalSignals.slice(0, 3).map(signal => <span key={signal.id}><Check size={11} /> {signal.name}</span>) : <span><Check size={11} /> No elevated technical signal</span>}</section><section><b>HUMAN</b>{humanSignals.length ? humanSignals.slice(0, 3).map(signal => <span key={signal.id}><Check size={11} /> {signal.name}</span>) : <span><Check size={11} /> No elevated human signal</span>}</section></div><p className="live-read__recommendation">{result.recommendations[0]}</p><div className="live-read__providers">{result.providers.map(provider => <span key={provider.source}>{provider.source} · {provider.status.replaceAll("_", " ")}</span>)}</div><small>{result.simulatedResponse.disclaimer}</small></div></article>}
            </div>}
          </div>
          <form className="live-read__composer" onSubmit={submitRead} noValidate>
            {file && <div className="live-read__attachment"><FileUp size={15} /><div><strong>{file.name}</strong><span>{displaySize(file.size)} · {file.type || "unknown MIME"} · {hashState === "reading" ? "Calculating local SHA-256…" : hashState === "ready" ? `SHA-256 ${fileHash?.slice(0, 12)}…` : "Metadata only"}</span></div><button type="button" onClick={clearFile} aria-label="Remove attached file"><X size={14} /></button></div>}
            <label className="sr-only" htmlFor="live-read-input">Message or email to analyze</label>
            <textarea id="live-read-input" rows={3} maxLength={8000} placeholder="Paste a message, email, or request. Add an attachment when its metadata needs a safe static read…" value={text} onChange={event => { setText(event.target.value); setResult(null); setError(null); setStage("ready"); }} />
            <div className="live-read__composer-actions"><input ref={fileInputRef} id="live-read-file" className="sr-only" type="file" onChange={onFileChange} /><label htmlFor="live-read-file"><Paperclip size={15} /> Attach file</label><span>Files are never uploaded, opened, or executed.</span><button type="submit" disabled={stage === "scanning"}>{stage === "scanning" ? <LoaderCircle className="demo-spin" size={15} /> : <SendHorizontal size={15} />} {stage === "scanning" ? "Reading" : "Read signal"}</button></div>
          </form>
        </section>
      </section>
    </main>
  );
}
