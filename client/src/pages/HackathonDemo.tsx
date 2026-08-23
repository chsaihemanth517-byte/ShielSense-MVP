import { ArrowLeft, Check, ChevronRight, CircleAlert, LoaderCircle, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { CinematicSignalField, type SignalMode } from "@/components/CinematicSignalField";
import type { ScanResult } from "@shared/scan";

type DemoCase = {
  id: string;
  label: string;
  tag: string;
  sender: string;
  address: string;
  subject: string;
  body: string;
  link: string;
};

const demoCases: DemoCase[] = [
  {
    id: "urgency",
    label: "Urgent access request",
    tag: "ELEVATED",
    sender: "Northline Operations",
    address: "accounts@northline-ops.example",
    subject: "Your account requires verification",
    body: "Please verify access before 12 PM to avoid interruption to your account.",
    link: "secure-northline-verify.example/verify-account?redirect=https%3A%2F%2Fworkspace.example",
  },
  {
    id: "lookalike",
    label: "Document share request",
    tag: "ELEVATED",
    sender: "Mira Chen · Finance",
    address: "mira.chen@financ3-team.example",
    subject: "Updated vendor payment sheet",
    body: "Can you review and approve the update before the vendor deadline? The document needs your sign-off today.",
    link: "drive-finance-team.example/review?redirect=https%3A%2F%2Fworkspace.example",
  },
  {
    id: "clear",
    label: "Routine meeting update",
    tag: "CLEAR",
    sender: "Alex Rivera · Product",
    address: "alex.rivera@your-company.example",
    subject: "Agenda for tomorrow’s review",
    body: "I added the agenda to our existing workspace for tomorrow’s product review. No action is required before the meeting.",
    link: "workspace.your-company.example/agenda",
  },
];

function modeFor(stage: "ready" | "scanning" | "complete" | "error", result: ScanResult | null): SignalMode {
  if (stage === "scanning") return "beam";
  if (stage === "complete") return result?.riskLevel === "low" ? "resolve" : "split";
  return "coherent";
}

async function readDemoScanResponse(response: Response): Promise<ScanResult> {
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error(`The ShieldSense scan API returned HTTP ${response.status} with no JSON response. Check the deployed API route and try again.`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(`The ShieldSense scan API returned HTTP ${response.status} instead of JSON. Check the deployed API function.`);
  }
  const result = payload as ScanResult & { message?: unknown };
  if (!response.ok || typeof result.riskScore !== "number") {
    throw new Error(typeof result.message === "string" ? result.message : "The analysis service did not return a valid result.");
  }
  return result;
}

export default function HackathonDemo() {
  const [selectedId, setSelectedId] = useState("urgency");
  const [stage, setStage] = useState<"ready" | "scanning" | "complete" | "error">("ready");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const selected = demoCases.find(demoCase => demoCase.id === selectedId) ?? demoCases[0];
  const technicalSignals = result?.signals.filter(signal => signal.channel === "technical") ?? [];
  const humanSignals = result?.signals.filter(signal => signal.channel === "human") ?? [];

  const selectCase = (id: string) => {
    setSelectedId(id);
    setStage("ready");
    setResult(null);
    setScanError(null);
  };

  const analyze = async () => {
    setStage("scanning");
    setResult(null);
    setScanError(null);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://${selected.link}`,
          pageTitle: selected.subject,
          pastedMessage: `${selected.subject}\n${selected.body}`,
          sourceContext: "pasted_message",
          persistMetadata: false,
        }),
      });
      setResult(await readDemoScanResponse(response));
      setStage("complete");
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "The analysis service could not be reached.");
      setStage("error");
    }
  };

  return (
    <main className="hackathon-demo">
      <header className="demo-header">
        <a className="brand" href="/" aria-label="Return to ShieldSense landing page">
          <span className="brand__mark" aria-hidden="true"><span /><span /></span>
          <span>SHIELDSENSE</span>
        </a>
        <div className="demo-header__meta"><span>HACKATHON DEMO</span><span>v0.1</span></div>
        <a className="demo-back" href="/"><ArrowLeft size={14} aria-hidden="true" /> Product site</a>
      </header>

      <section className="demo-intro">
        <div>
          <p className="eyebrow">[ LIVE PRODUCT PROOF ]</p>
          <h1>See the message.<br /><em>Read the signal.</em></h1>
        </div>
        <p>ShieldSense combines technical threat signals and human-manipulation signals, then translates both into the safest next action.</p>
      </section>

      <section className="demo-console" aria-label="ShieldSense message analysis demonstration">
        <aside className="demo-cases" aria-label="Choose a demonstration case">
          <p className="demo-panel-label">01 / SELECT A MESSAGE</p>
          {demoCases.map(demoCase => (
            <button key={demoCase.id} type="button" className={demoCase.id === selected.id ? "is-selected" : ""} onClick={() => selectCase(demoCase.id)}>
              <span className={`case-dot case-dot--${demoCase.id === "clear" ? "clear" : "elevated"}`} />
              <span><b>{demoCase.label}</b><small>{demoCase.id === "clear" ? "SAFE REFERENCE" : "SIMULATION"}</small></span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          ))}
          <p className="demo-cases__note">Fictional hackathon cases. Content is sent only after you choose Analyze; it is never persisted by this demo.</p>
        </aside>

        <article className="demo-message">
          <p className="demo-panel-label">02 / MESSAGE CONTEXT</p>
          <div className="demo-message__from"><span>{selected.sender.slice(0, 1)}</span><div><b>{selected.sender}</b><small>{selected.address}</small></div><time>10:42</time></div>
          <div className="demo-message__copy"><p className="demo-message__subject">{selected.subject}</p><p>{selected.body}</p><span>{selected.link}</span></div>
          <button type="button" className="demo-analyze" onClick={analyze} disabled={stage === "scanning"}>
            {stage === "scanning" ? <LoaderCircle className="demo-spin" size={16} aria-hidden="true" /> : <Radar size={16} aria-hidden="true" />}
            {stage === "scanning" ? "Reading both channels…" : "Analyze this message"}
          </button>
        </article>

        <article className={`demo-read demo-read--${stage} demo-read--${result?.riskLevel ?? "ready"}`} aria-live="polite">
          <div className="demo-read__visual" aria-hidden="true"><CinematicSignalField mode={modeFor(stage, result)} /></div>
          <div className="demo-read__head"><p className="demo-panel-label">03 / TWO-CHANNEL READ</p><span className="demo-read__state">{stage === "complete" ? result?.riskLevel.toUpperCase() : stage === "scanning" ? "READING" : stage === "error" ? "UNAVAILABLE" : "READY"}</span></div>
          {stage === "ready" && <div className="demo-read__empty"><Sparkles size={20} /><p>Choose a fictional case, then click <b>Analyze this message</b>. The evidence channels will resolve here.</p></div>}
          {stage === "scanning" && <div className="demo-read__empty"><LoaderCircle className="demo-spin" size={21} /><p>Tracing sender identity, route behavior, and manipulation cues.</p></div>}
          {stage === "error" && <div className="demo-read__empty"><CircleAlert size={21} /><p>{scanError} Local fixtures remain available; retry once the scan API is running.</p></div>}
          {stage === "complete" && <div className="demo-evidence">
            <section className="evidence-channel evidence-channel--technical"><p>TECHNICAL SIGNALS</p>{technicalSignals.length ? technicalSignals.map(signal => <span key={signal.id}><Check size={12} />{signal.name}</span>) : <span><Check size={12} />No elevated technical signal found.</span>}</section>
            <section className="evidence-channel evidence-channel--human"><p>HUMAN SIGNALS</p>{humanSignals.length ? humanSignals.map(signal => <span key={signal.id}><Check size={12} />{signal.name}</span>) : <span><Check size={12} />No elevated human signal found.</span>}</section>
            <section className="demo-action"><div>{result?.riskLevel === "low" ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}</div><p className="demo-panel-label">RECOMMENDED RESPONSE · SCORE {result?.riskScore}/100</p><h2>{result?.recommendations[0]}</h2><p>{result?.recommendations.slice(1).join(" ")}</p><div className="demo-provider-states">{result?.providers.map(provider => <span key={provider.source}>{provider.source}: {provider.status.replaceAll("_", " ")}</span>)}</div></section>
          </div>}
        </article>
      </section>

      <section className="demo-proof">
        <p className="eyebrow">[ WHAT THE JUDGES ARE SEEING ]</p>
        <div className="demo-proof__flow"><span>Browser extension</span><i /><span>Two-channel signal engine</span><i /><span>Explainable response</span></div>
        <div className="demo-proof__summary" aria-live="polite">
          <span><b>Extension event</b>{stage === "ready" ? "Ready" : stage === "scanning" ? "Scan requested" : "Scan complete"}</span>
          <span><b>Evidence split</b>{stage === "complete" ? `${technicalSignals.length} technical · ${humanSignals.length} human` : "Pending analysis"}</span>
          <span><b>Response</b>{stage === "complete" ? result?.recommendations[0] : "Waiting for the read"}</span>
        </div>
        <p>One message becomes evidence a person can understand and act on—without reducing the decision to an opaque risk score.</p>
      </section>
    </main>
  );
}
