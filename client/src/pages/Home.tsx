import { ArrowDown, ArrowUpRight, Check, ChevronRight, CircleAlert, Fingerprint, LockKeyhole, Plus, Radar, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CinematicSignalField } from "@/components/CinematicSignalField";
import { useExtensionScan } from "@/hooks/useExtensionScan";
import { trpc } from "@/lib/trpc";
import type { ScanHistoryEntry, ScanInputType, ScanResult } from "@shared/scan";

const sceneLinks = [
  { label: "Home", href: "#home" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Product", href: "#product" },
  { label: "About", href: "#about" },
];

const walkthroughSteps = [
  {
    number: "01",
    eyebrow: "RECOGNIZE",
    title: "Read the complete signal.",
    body: "A link, its routing behavior, and the message around it are read together—not in isolation.",
    icon: Radar,
  },
  {
    number: "02",
    eyebrow: "EXPLAIN",
    title: "Show the reasoning plainly.",
    body: "A technical trace sits beside a clear description of the pressure tactic being used.",
    icon: ScanSearch,
  },
  {
    number: "03",
    eyebrow: "RESPOND",
    title: "Make the next move clear.",
    body: "ShieldSense turns detection into a practical, immediate recommendation—before a rushed click becomes a problem.",
    icon: ShieldCheck,
  },
];

const faqs = [
  {
    question: "How is ShieldSense different from Safe Browsing or VirusTotal?",
    answer:
      "Reputation tools are useful signals, especially for previously reported URLs and domains. ShieldSense is designed to add context by reading technical characteristics alongside the manipulation patterns in the message itself.",
  },
  {
    question: "Does it help with new or unreported threats?",
    answer:
      "That is the purpose of combining channels. A newly created or altered link may not yet have an established reputation, while its technical characteristics and the surrounding pressure language can still deserve a closer look.",
  },
  {
    question: "What data does ShieldSense access?",
    answer:
      "ShieldSense is being built around data minimization. The product will clearly explain what it needs to analyze a message or link, and the waitlist is only used to share launch information—never sold to third parties.",
  },
];

type HeroScanStage = "ready" | "scanning" | "complete" | "error";
type HeroScanMode = ScanInputType;

const HERO_HISTORY_STORAGE_KEY = "shieldsense.hero-scan-ids.v1";

function progressStagesFor(mode: HeroScanMode) {
  if (mode === "file") return ["VALIDATING METADATA", "STATIC HEURISTIC ANALYSIS", "CORRELATING SIGNALS", "RISK ASSESSMENT"];
  if (mode === "message") return ["VALIDATING MESSAGE", "HUMAN-SIGNAL HEURISTICS", "CORRELATING SIGNALS", "RISK ASSESSMENT"];
  return ["VALIDATING LINK", "HEURISTIC ANALYSIS", "THREAT-INTELLIGENCE LOOKUPS", "RISK ASSESSMENT"];
}

function historyEntryFromResult(result: ScanResult, identifier: string): ScanHistoryEntry {
  return {
    scanId: result.scanId,
    createdAt: new Date().toISOString(),
    inputType: result.inputType,
    inputIdentifier: identifier,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    verdict: result.verdict,
    responseAction: result.simulatedResponse.action,
  };
}

function formattedFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formattedHistoryTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Just now" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

async function sha256ForFile(file: File) {
  if (!window.crypto?.subtle) return undefined;
  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const mutation = trpc.waitlist.join.useMutation({
    onSuccess: result => {
      setAnnouncement(
        result.status === "already_registered"
          ? "You are already on the ShieldSense waitlist."
          : "You are on the list. We will be in touch when ShieldSense is ready.",
      );
      if (result.status === "created") setEmail("");
    },
    onError: error => setAnnouncement(error.message || "We could not save your place. Please try again."),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnnouncement("");
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setAnnouncement("Enter your email address to join the waitlist.");
      return;
    }
    mutation.mutate({ email: normalizedEmail });
  };

  return (
    <form className={`waitlist-form ${compact ? "waitlist-form--compact" : ""}`} onSubmit={handleSubmit} noValidate>
      <label className="sr-only" htmlFor={compact ? "header-waitlist-email" : "waitlist-email"}>
        Email address
      </label>
      <div className="waitlist-form__row">
        <input
          id={compact ? "header-waitlist-email" : "waitlist-email"}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={event => setEmail(event.target.value)}
          aria-describedby={compact ? undefined : "waitlist-privacy"}
          required
        />
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : compact ? "Join" : "Join the waitlist"}
          {!mutation.isPending && <ArrowUpRight size={16} aria-hidden="true" />}
        </button>
      </div>
      <p className="waitlist-form__status" role="status" aria-live="polite">
        {announcement}
      </p>
      {!compact && (
        <p id="waitlist-privacy" className="waitlist-form__privacy">
          Launch notes only. No tracking stories. No selling your data.
        </p>
      )}
    </form>
  );
}

export default function Home() {
  const heroVisualRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [activeSection, setActiveSection] = useState("home");
  const liveScan = useExtensionScan();
  const [scanMode, setScanMode] = useState<HeroScanMode>("url");
  const [linkValue, setLinkValue] = useState("");
  const [messageValue, setMessageValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string | undefined>();
  const [fileHashState, setFileHashState] = useState<"idle" | "reading" | "ready" | "unavailable">("idle");
  const [heroStage, setHeroStage] = useState<HeroScanStage>("ready");
  const [progressIndex, setProgressIndex] = useState(0);
  const [heroResult, setHeroResult] = useState<ScanResult | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scanStatus =
    liveScan.connectionState === "scanning"
      ? "Reading the technical and human signal channels…"
      : liveScan.connectionState === "complete"
        ? liveScan.verdict === "clear"
          ? "Scan complete. No elevated signal is currently reported."
          : "Scan complete. Evidence channels need your attention."
        : liveScan.connectionState === "unavailable"
          ? "ShieldSense extension not detected. Connect the extension to stream a real scan."
          : "Waiting for an authorized ShieldSense extension.";

  useEffect(() => {
    const stored = window.sessionStorage.getItem(HERO_HISTORY_STORAGE_KEY);
    const ids = stored ? stored.split(",").filter(id => /^[a-f0-9-]{36}$/i.test(id)).slice(0, 5) : [];
    if (!ids.length) return;
    void fetch(`/api/scan-history?ids=${encodeURIComponent(ids.join(","))}`)
      .then(response => response.ok ? response.json() as Promise<{ entries?: ScanHistoryEntry[] }> : { entries: [] })
      .then(payload => {
        if (payload.entries?.length) setScanHistory(payload.entries);
      })
      .catch(() => undefined);
  }, []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFileHash(undefined);
    setHeroError(null);
    setHeroResult(null);
    setHeroStage("ready");
    if (!file) {
      setFileHashState("idle");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileHashState("unavailable");
      setHeroError("Choose a file no larger than 10 MB. ShieldSense will only read safe metadata and a local hash.");
      return;
    }
    setFileHashState("reading");
    try {
      const hash = await sha256ForFile(file);
      setFileHash(hash);
      setFileHashState(hash ? "ready" : "unavailable");
    } catch {
      setFileHashState("unavailable");
    }
  };

  const appendHistory = async (result: ScanResult, identifier: string) => {
    const localEntry = historyEntryFromResult(result, identifier);
    setScanHistory(current => [localEntry, ...current.filter(entry => entry.scanId !== localEntry.scanId)].slice(0, 5));
    const existing = window.sessionStorage.getItem(HERO_HISTORY_STORAGE_KEY)?.split(",").filter(Boolean) ?? [];
    const ids = [result.scanId, ...existing.filter(id => id !== result.scanId)].slice(0, 5);
    window.sessionStorage.setItem(HERO_HISTORY_STORAGE_KEY, ids.join(","));
    if (!result.privacy.metadataPersisted) return;
    try {
      const response = await fetch(`/api/scan-history?ids=${encodeURIComponent(ids.join(","))}`);
      const payload = await response.json() as { entries?: ScanHistoryEntry[] };
      if (response.ok && payload.entries?.length) setScanHistory(payload.entries);
    } catch {
      // The browser-session summary remains available without exposing raw input.
    }
  };

  const submitHeroScan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHeroError(null);
    setHeroResult(null);
    let payload: Record<string, unknown>;
    let historyIdentifier: string;
    if (scanMode === "url") {
      let normalizedUrl = linkValue.trim();
      if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
      try {
        new URL(normalizedUrl);
      } catch {
        setHeroStage("error");
        setHeroError("Enter a complete web address, such as https://example.com.");
        return;
      }
      historyIdentifier = "Submitted link";
      payload = { url: normalizedUrl, sourceContext: "hero_url", persistMetadata: true };
    } else if (scanMode === "message") {
      const message = messageValue.trim();
      if (!message) {
        setHeroStage("error");
        setHeroError("Paste the email or message you want ShieldSense to read.");
        return;
      }
      historyIdentifier = "Pasted message";
      payload = { pastedMessage: message, sourceContext: "hero_message", persistMetadata: true };
    } else {
      if (!selectedFile) {
        setHeroStage("error");
        setHeroError("Choose a file before starting a static metadata scan.");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setHeroStage("error");
        setHeroError("Choose a file no larger than 10 MB.");
        return;
      }
      historyIdentifier = selectedFile.name.replace(/[^\w. ()-]/g, "_").slice(0, 180) || "Selected file";
      payload = {
        file: { name: historyIdentifier, size: selectedFile.size, mimeType: selectedFile.type || "application/octet-stream", sha256: fileHash },
        sourceContext: "hero_file",
        persistMetadata: true,
      };
    }

    setHeroStage("scanning");
    setProgressIndex(0);
    const stages = progressStagesFor(scanMode);
    const progressTimer = window.setInterval(() => setProgressIndex(current => Math.min(current + 1, stages.length - 1)), 420);
    try {
      const response = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const scanPayload = await response.json() as ScanResult | { message?: string };
      if (!response.ok || !("riskScore" in scanPayload)) throw new Error("message" in scanPayload ? scanPayload.message : "The analysis service did not return a valid result.");
      setProgressIndex(stages.length - 1);
      setHeroResult(scanPayload);
      setHeroStage("complete");
      void appendHistory(scanPayload, historyIdentifier);
    } catch (error) {
      setHeroStage("error");
      setHeroError(error instanceof Error ? error.message : "ShieldSense could not complete this scan. Please try again.");
    } finally {
      window.clearInterval(progressTimer);
    }
  };

  useEffect(() => {
    const scenes = Array.from(document.querySelectorAll<HTMLElement>(".story-scene"));
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            const sectionId = entry.target.id || (entry.target.classList.contains("story-scene--product") ? "product" : entry.target.classList.contains("story-scene--audience") ? "about" : "how-it-works");
            setActiveSection(sectionId);
          }
        });
      },
      { threshold: 0.42 },
    );

    scenes.forEach(scene => observer.observe(scene));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motionStages = Array.from(
      document.querySelectorAll<HTMLElement>(".hero-visual, .threat-visual, .message-stage, .split-stage, .walkthrough-grid"),
    );
    let animationFrame: number | null = null;

    const updateScrollChoreography = () => {
      const viewportHeight = window.innerHeight;
      motionStages.forEach(stage => {
        const bounds = stage.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (viewportHeight - bounds.top) / (viewportHeight + bounds.height)));
        const centered = 1 - Math.min(1, Math.abs(0.5 - progress) * 2);

        stage.style.setProperty("--scroll-lift", `${((0.5 - progress) * 28).toFixed(1)}px`);
        stage.style.setProperty("--scroll-scale", (0.955 + centered * 0.045).toFixed(3));

        if (stage.classList.contains("message-stage")) {
          stage.style.setProperty("--scan-y", `${((0.5 - progress) * 86).toFixed(1)}px`);
          stage.style.setProperty("--scan-scale", (0.74 + centered * 0.26).toFixed(3));
          stage.style.setProperty("--scan-opacity", (0.22 + centered * 0.78).toFixed(3));
        }
      });
      animationFrame = null;
    };

    const requestUpdate = () => {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(updateScrollChoreography);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const visual = heroVisualRef.current;
    const canUsePointerDepth = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!visual || !canUsePointerDepth.matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let animationFrame: number | null = null;

    const render = () => {
      current.x += (target.x - current.x) * 0.085;
      current.y += (target.y - current.y) * 0.085;

      visual.style.setProperty("--pointer-far-x", `${(current.x * 5).toFixed(2)}px`);
      visual.style.setProperty("--pointer-far-y", `${(current.y * 4).toFixed(2)}px`);
      visual.style.setProperty("--pointer-near-x", `${(current.x * 14).toFixed(2)}px`);
      visual.style.setProperty("--pointer-near-y", `${(current.y * 11).toFixed(2)}px`);
      visual.style.setProperty("--pointer-tilt", `${(current.x * 1.35).toFixed(2)}deg`);

      const stillMoving = Math.abs(target.x - current.x) > 0.06 || Math.abs(target.y - current.y) > 0.06;
      animationFrame = stillMoving ? window.requestAnimationFrame(render) : null;
    };

    const requestRender = () => {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = visual.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
      target.y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
      requestRender();
    };

    const onPointerLeave = () => {
      target.x = 0;
      target.y = 0;
      requestRender();
    };

    visual.addEventListener("pointermove", onPointerMove);
    visual.addEventListener("pointerleave", onPointerLeave);
    return () => {
      visual.removeEventListener("pointermove", onPointerMove);
      visual.removeEventListener("pointerleave", onPointerLeave);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    const canUseSignalCursor = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!cursor || !canUseSignalCursor.matches) return;

    document.body.classList.add("signal-cursor-enabled");

    const target = { x: -80, y: -80 };
    const current = { x: -80, y: -80 };
    let animationFrame: number | null = null;

    const render = () => {
      current.x += (target.x - current.x) * 0.19;
      current.y += (target.y - current.y) * 0.19;
      cursor.style.setProperty("--cursor-x", `${current.x.toFixed(1)}px`);
      cursor.style.setProperty("--cursor-y", `${current.y.toFixed(1)}px`);
      const stillMoving = Math.abs(target.x - current.x) > 0.1 || Math.abs(target.y - current.y) > 0.1;
      animationFrame = stillMoving ? window.requestAnimationFrame(render) : null;
    };

    const requestRender = () => {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(render);
    };
    const onPointerMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      const targetElement = event.target instanceof Element ? event.target : null;
      cursor.classList.toggle("is-active", Boolean(targetElement?.closest("a, button, summary, input, label")));
      requestRender();
    };
    const hideCursor = () => cursor.classList.remove("is-visible");
    const showCursor = () => cursor.classList.add("is-visible");

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", hideCursor);
    window.addEventListener("focus", showCursor);
    showCursor();
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", hideCursor);
      window.removeEventListener("focus", showCursor);
      document.body.classList.remove("signal-cursor-enabled");
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <main className="shieldsense-site">
      <span ref={cursorRef} className="signal-cursor" aria-hidden="true"><span /></span>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-chrome" aria-label="Primary navigation">
        <a className="brand" href="#home" aria-label="ShieldSense home">
          <span className="brand__mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>SHIELDSENSE</span>
        </a>
        <a className="top-cta" href="/live-read">
          <span>Get ShieldSense</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </header>

      <nav className="floating-nav" aria-label="Section navigation">
        {sceneLinks.map(link => (
          <a key={link.href} href={link.href} className={activeSection === link.href.slice(1) ? "is-current" : undefined} aria-current={activeSection === link.href.slice(1) ? "page" : undefined}>
            {link.label}
          </a>
        ))}
      </nav>

      <div id="main-content">
        <section id="home" className="story-scene story-scene--hero is-visible">
          <div className="scene-grain" aria-hidden="true" />
          <div className="scene-copy hero-copy">
            <p className="eyebrow">[ THREAT DETECTION ]</p>
            <h1>
              Reading the signal
              <span>behind the message.</span>
            </h1>
            <p className="scene-lede">
              ShieldSense reads technical threat signals and human-manipulation signals together—then makes the safest next move easier to see.
            </p>
            <form className={`hero-scan-panel hero-scan-panel--${heroStage}`} onSubmit={submitHeroScan} noValidate aria-label="Scan a link, file, or message">
              <div className="hero-scan-panel__head">
                <p>[ TRY THE LIVE READ ]</p>
                <button type="button" className="hero-scan-panel__history-toggle" onClick={() => setShowHistory(current => !current)} aria-expanded={showHistory}>
                  {showHistory ? "Close history" : `Recent scans${scanHistory.length ? ` · ${scanHistory.length}` : ""}`}
                </button>
              </div>
              <div className="hero-scan-tabs" aria-label="Choose scan type">
                {(["url", "file", "message"] as const).map(mode => (
                  <button key={mode} type="button" aria-pressed={scanMode === mode} className={scanMode === mode ? "is-active" : undefined} onClick={() => { setScanMode(mode); setHeroStage("ready"); setHeroError(null); setHeroResult(null); }}>
                    {mode === "url" ? "Link" : mode === "file" ? "File" : "Message"}
                  </button>
                ))}
              </div>
              <div className="hero-scan-panel__field">
                {scanMode === "url" && <><label htmlFor="hero-scan-url">Web address</label><input id="hero-scan-url" type="url" inputMode="url" autoComplete="url" placeholder="https://example.com" value={linkValue} onChange={event => { setLinkValue(event.target.value); setHeroStage("ready"); setHeroResult(null); }} /></>}
                {scanMode === "message" && <><label htmlFor="hero-scan-message">Email or message</label><textarea id="hero-scan-message" rows={3} maxLength={8000} placeholder="Paste a message to inspect its wording and pressure signals…" value={messageValue} onChange={event => { setMessageValue(event.target.value); setHeroStage("ready"); setHeroResult(null); }} /></>}
                {scanMode === "file" && <div className="hero-file-field"><label htmlFor="hero-scan-file">Choose a file</label><input id="hero-scan-file" type="file" onChange={handleFileChange} aria-describedby="hero-file-privacy" /><p id="hero-file-privacy">Metadata and a local SHA-256 only. ShieldSense never uploads, opens, or executes this file.</p>{selectedFile && <div className="hero-file-field__meta"><span>{selectedFile.name}</span><span>{formattedFileSize(selectedFile.size)} · {selectedFile.type || "unknown MIME"}</span><span>{fileHashState === "reading" ? "Calculating local SHA-256…" : fileHashState === "ready" ? `SHA-256 ${fileHash?.slice(0, 12)}…` : "Hash unavailable; metadata checks still apply."}</span></div>}</div>}
              </div>
              <div className="hero-scan-panel__action"><button type="submit" disabled={heroStage === "scanning"}>{heroStage === "scanning" ? "Reading signal…" : scanMode === "file" ? "Inspect file metadata" : "Run ShieldSense scan"}</button><span>Explicit scan only · raw input is not stored</span></div>
              {heroStage === "scanning" && <div className="hero-scan-progress" role="status" aria-live="polite">{progressStagesFor(scanMode).map((stage, index) => <span key={stage} className={index <= progressIndex ? "is-active" : undefined}>{index === progressIndex ? "●" : "○"} {stage}</span>)}</div>}
              {heroStage === "error" && heroError && <p className="hero-scan-error" role="alert">{heroError}</p>}
              {heroStage === "complete" && heroResult && <article className={`hero-scan-result hero-scan-result--${heroResult.riskLevel}`} aria-live="polite"><div className="hero-scan-result__summary"><p>[ RESULT ]</p><strong>{heroResult.riskScore}<small>/100</small></strong><span>{heroResult.riskLevel.toUpperCase()} · {heroResult.verdict.replaceAll("_", " ")}</span></div><div className="hero-scan-result__body"><span className={`hero-scan-response hero-scan-response--${heroResult.simulatedResponse.action}`}>SIMULATED · {heroResult.simulatedResponse.label}</span><p>{heroResult.explanation}</p><div className="hero-scan-evidence">{heroResult.signals.length ? heroResult.signals.slice(0, 3).map(signal => <span key={signal.id}>{signal.channel === "technical" ? "TECH" : "HUMAN"} · {signal.name}</span>) : <span>NO ELEVATED LOCAL SIGNAL</span>}</div><p className="hero-scan-recommendation">{heroResult.recommendations[0]}</p><div className="hero-scan-providers">{heroResult.providers.map(provider => <span key={provider.source}>{provider.source} · {provider.status.replaceAll("_", " ")}</span>)}</div><small>{heroResult.simulatedResponse.disclaimer}</small></div></article>}
              {showHistory && <div className="hero-scan-history" aria-live="polite"><p>[ PRIVACY-SAFE RECENT HISTORY · NEWEST FIRST ]</p>{scanHistory.length ? scanHistory.map(entry => <div key={entry.scanId}><span><b>{entry.inputType.toUpperCase()} · {entry.inputIdentifier}</b><small>{formattedHistoryTime(entry.createdAt)} · {entry.riskLevel.toUpperCase()} · {entry.verdict.replaceAll("_", " ")}</small></span><span className={`history-risk history-risk--${entry.riskLevel}`}>{entry.riskScore}/100 · {entry.responseAction.toUpperCase()}</span></div>) : <span>No scans in this browser session yet. Raw links, messages, and files are never listed here.</span>}</div>}
            </form>
            <a className="text-link" href="#how-it-works">
              See the two-channel read <ChevronRight size={16} aria-hidden="true" />
            </a>
          </div>
          <div className="hero-visual" ref={heroVisualRef}>
            <CinematicSignalField mode={liveScan.sceneMode} />
            <div className="hero-visual__orbital" aria-hidden="true"><span /><span /><span /></div>
            <div className="hero-visual__annotation" aria-hidden="true">
              <span>signal / {liveScan.connectionState === "complete" ? "live" : "02"}</span>
              <span>{liveScan.connectionState === "scanning" ? "analysis in motion" : "message analysis"}</span>
            </div>
            <div className={`live-scan-hud live-scan-hud--${liveScan.connectionState} ${liveScan.verdict === "clear" ? "live-scan-hud--clear" : ""}`} role="status" aria-live="polite">
              <div className="live-scan-hud__head">
                <span className="live-scan-hud__pulse" aria-hidden="true" />
                <span>LIVE EXTENSION SIGNAL</span>
              </div>
              <p>{scanStatus}</p>
              {liveScan.connectionState === "complete" && (
                <div className="live-scan-hud__signals">
                  {liveScan.technicalSignals.slice(0, 2).map(signal => <span key={signal}>TECH / {signal.replaceAll("_", " ")}</span>)}
                  {liveScan.humanSignals.slice(0, 2).map(signal => <span key={signal}>HUMAN / {signal.replaceAll("_", " ")}</span>)}
                </div>
              )}
              <button type="button" onClick={liveScan.requestScan} disabled={liveScan.connectionState === "scanning"}>
                {liveScan.connectionState === "scanning" ? "Reading signal…" : "Request live scan"}
              </button>
            </div>
          </div>
          <a className="scroll-cue" href="#threat">
            <ArrowDown size={15} aria-hidden="true" />
            <span>Scroll to explore</span>
          </a>
        </section>

        <section id="threat" className="story-scene story-scene--threat">
          <div className="scene-copy scene-copy--centered">
            <p className="eyebrow">[ THE PROBLEM ]</p>
            <h2>Some threats arrive looking completely ordinary.</h2>
            <p className="scene-lede">
              A familiar sender, a routine request, a convincing link. The danger is often hidden in the seams between what a message says and what it does.
            </p>
          </div>
          <div className="threat-visual" aria-hidden="true">
            <CinematicSignalField mode="dispersed" />
            <div className="threat-visual__fragment fragment--one">your invoice is ready</div>
            <div className="threat-visual__fragment fragment--two">view document</div>
          </div>
        </section>

        <section id="how-it-works" className="story-scene story-scene--blacklist">
          <div className="scene-copy blacklist-copy">
            <p className="eyebrow">[ REPUTATION IS ONE SIGNAL ]</p>
            <h2>A bad link is not the whole story.</h2>
            <p className="scene-lede">
              Blacklists can tell you what has already been reported. But new domains, altered paths, and social pressure require another kind of reading.
            </p>
          </div>
          <div className="message-stage" aria-label="Illustration of a message being scanned">
            <CinematicSignalField mode="beam" />
            <div className="scan-beam" aria-hidden="true" />
            <div className="message-card">
              <div className="message-card__topline">
                <span className="message-avatar">N</span>
                <div>
                  <strong>Northline Operations</strong>
                  <small>accounts@northline-ops.co</small>
                </div>
                <span className="message-time">11:48</span>
              </div>
              <p>Hi Alex — your account is scheduled for review today.</p>
              <p className="message-card__urgent">Please verify access before 12 PM to avoid interruption.</p>
              <span className="message-link">secure-northline-verify.co/session</span>
            </div>
            <div className="scan-callout scan-callout--technical">
              <span className="scan-callout__dot" />
              <p><b>Reputation check</b><br />URL and domain history</p>
            </div>
            <div className="scan-callout scan-callout--human">
              <span className="scan-callout__dot" />
              <p><b>Often missed</b><br />New link + urgency pressure</p>
            </div>
          </div>
        </section>

        <section className="story-scene story-scene--split">
          <div className="scene-copy split-copy">
            <p className="eyebrow">[ THE SHIELDSENSE READ ]</p>
            <h2>One message. Two channels of evidence.</h2>
            <p className="scene-lede">
              ShieldSense places the technical trace beside the human tactic—so the moment is understandable, not just suspicious.
            </p>
          </div>
          <div className="split-stage" aria-label="Illustration of ShieldSense detecting two channels of risk">
            <CinematicSignalField mode="split" />
            <div className="scan-lock" aria-hidden="true">
              <span className="scan-lock__corner scan-lock__corner--tl" />
              <span className="scan-lock__corner scan-lock__corner--tr" />
              <span className="scan-lock__corner scan-lock__corner--bl" />
              <span className="scan-lock__corner scan-lock__corner--br" />
              <div className="scan-lock__core"><Fingerprint size={37} /></div>
            </div>
            <div className="split-trace split-trace--technical">
              <p className="trace-label">[ TECHNICAL TRACE ]</p>
              <span>DOMAIN_AGE / RECENT</span>
              <span>REDIRECT_CHAIN / 03</span>
              <span>IDENTITY_MATCH / LOW</span>
            </div>
            <div className="split-trace split-trace--human">
              <p className="trace-label">[ HUMAN SIGNAL ]</p>
              <strong>Urgency + impersonated sender</strong>
              <span>The request creates a time limit before trust is established.</span>
            </div>
          </div>
        </section>

        <section className="story-scene story-scene--action">
          <div className="scene-copy action-copy">
            <p className="eyebrow">[ THE NEXT MOVE ]</p>
            <h2>Detection should lead somewhere.</h2>
            <p className="scene-lede">
              A verdict without guidance leaves the hardest decision to the user. ShieldSense translates a read into an immediate response.
            </p>
          </div>
          <div className="action-card" aria-label="Illustrative ShieldSense recommended action">
            <CinematicSignalField mode="resolve" />
            <div className="action-card__signal"><CircleAlert size={22} /></div>
            <div className="action-card__head">
              <span className="eyebrow">[ RECOMMENDED ACTION ]</span>
              <span className="risk-label">Elevated risk</span>
            </div>
            <h3>Do not open this link.</h3>
            <p>Contact Northline through a known channel before taking any action on the request.</p>
            <div className="action-card__steps">
              <span><Check size={14} /> Pause the request</span>
              <span><Check size={14} /> Verify independently</span>
              <span><Check size={14} /> Report if needed</span>
            </div>
          </div>
        </section>

        <section id="product" className="story-scene story-scene--product">
          <div className="scene-copy product-copy">
            <p className="eyebrow">[ PRODUCT WALKTHROUGH ]</p>
            <h2>Calm clarity, when a message asks you to rush.</h2>
            <p className="scene-lede">A focused flow designed to make a complicated moment feel legible.</p>
          </div>
          <div className="walkthrough-grid">
            <CinematicSignalField mode="split" />
            {walkthroughSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className={`walkthrough-card walkthrough-card--${index + 1}`} key={step.number}>
                  <div className="walkthrough-card__topline">
                    <span>[ {step.number} ]</span>
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <p className="card-eyebrow">{step.eyebrow}</p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <span className="concept-label">Illustrative product concept</span>
                </article>
              );
            })}
          </div>
        </section>

        <section id="about" className="story-scene story-scene--audience">
          <div className="audience-grid">
            <div className="scene-copy">
              <p className="eyebrow">[ WHO IT IS FOR ]</p>
              <h2>For anyone who receives a message before they can investigate it.</h2>
              <div className="audience-signal-card" aria-label="ShieldSense reads two types of context together">
                <CinematicSignalField mode="split" />
                <div className="audience-signal-card__copy">
                  <p>[ ONE MESSAGE, TWO CONTEXTS ]</p>
                  <strong>The signal is never just the link.</strong>
                  <span>ShieldSense reads what the message does and what it asks a person to feel.</span>
                </div>
                <div className="audience-signal-card__channels" aria-hidden="true">
                  <span>TECHNICAL CONTEXT</span>
                  <span>HUMAN CONTEXT</span>
                </div>
              </div>
            </div>
            <div className="audience-list">
              <article className="audience-item">
                <span className="audience-item__index">01</span>
                <div>
                  <h3>Everyday people</h3>
                  <p>People making ordinary decisions online who need a quick way to understand what sits behind a message, link, or request.</p>
                </div>
              </article>
              <article className="audience-item">
                <span className="audience-item__index">02</span>
                <div>
                  <h3>Remote workers</h3>
                  <p>People moving quickly between messages, tools, files, and requests who need context without interrupting their workflow.</p>
                </div>
              </article>
              <article className="audience-item">
                <span className="audience-item__index">03</span>
                <div>
                  <h3>Families and individuals</h3>
                  <p>People helping themselves or others decide whether an unfamiliar message deserves trust, caution, or further investigation.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="faq-section" aria-labelledby="faq-heading">
          <div className="faq-section__intro">
            <p className="eyebrow">[ QUESTIONS, ANSWERED ]</p>
            <h2 id="faq-heading">The context behind the context.</h2>
            <p>ShieldSense is built to support better judgment—not replace it.</p>
          </div>
          <div className="faq-list">
            {faqs.map(faq => (
              <details key={faq.question} className="faq-item">
                <summary>
                  <span>{faq.question}</span>
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="waitlist" className="final-cta">
          <div className="final-cta__halo" aria-hidden="true"><Sparkles size={76} /></div>
          <p className="eyebrow">[ EARLY ACCESS ]</p>
          <h2>Meet the signal before it becomes a click.</h2>
          <p>Join the ShieldSense waitlist for launch news and early product updates.</p>
          <WaitlistForm />
        </section>
      </div>

      <footer className="site-footer">
        <a className="brand" href="#home" aria-label="ShieldSense home">
          <span className="brand__mark" aria-hidden="true"><span /><span /></span>
          <span>SHIELDSENSE</span>
        </a>
        <p>Technical threat signals + human-manipulation signals.</p>
        <p>Privacy-first direction. No data selling.</p>
      </footer>
    </main>
  );
}
