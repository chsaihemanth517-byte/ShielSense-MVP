import { ArrowLeft, Check, ChevronRight, CircleAlert, LoaderCircle, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CinematicSignalField, type SignalMode } from "@/components/CinematicSignalField";

type Verdict = "clear" | "elevated";

type DemoCase = {
  id: string;
  label: string;
  tag: string;
  sender: string;
  address: string;
  subject: string;
  body: string;
  link: string;
  verdict: Verdict;
  technical: string[];
  human: string[];
  action: string;
  actionDetail: string;
};

const demoCases: DemoCase[] = [
  {
    id: "urgency",
    label: "Urgent access request",
    tag: "ELEVATED",
    sender: "Northline Operations",
    address: "accounts@northline-ops.co",
    subject: "Your account requires verification",
    body: "Please verify access before 12 PM to avoid interruption to your account.",
    link: "secure-northline-verify.co/session",
    verdict: "elevated",
    technical: ["Recent domain registration", "Three-hop redirect chain", "Low sender-domain match"],
    human: ["Artificial time pressure", "Impersonated business identity"],
    action: "Do not open this link.",
    actionDetail: "Contact Northline through a known address or phone number before taking action.",
  },
  {
    id: "lookalike",
    label: "Document share request",
    tag: "ELEVATED",
    sender: "Mira Chen · Finance",
    address: "mira.chen@financ3-team.com",
    subject: "Updated vendor payment sheet",
    body: "Can you review and approve the update before the vendor deadline? The document needs your sign-off today.",
    link: "drive-finance-team.co/review",
    verdict: "elevated",
    technical: ["Lookalike sender domain", "Unfamiliar document host", "Identity mismatch"],
    human: ["Authority pressure", "Deadline framing"],
    action: "Verify the sender independently.",
    actionDetail: "Open your known finance workspace or call the sender using an established channel.",
  },
  {
    id: "clear",
    label: "Routine meeting update",
    tag: "CLEAR",
    sender: "Alex Rivera · Product",
    address: "alex.rivera@your-company.com",
    subject: "Agenda for tomorrow’s review",
    body: "I added the agenda to our existing workspace for tomorrow’s product review. No action is required before the meeting.",
    link: "workspace.your-company.com/agenda",
    verdict: "clear",
    technical: ["Known sender-domain match", "Direct established workspace route"],
    human: ["No urgency framing", "Context matches existing work"],
    action: "No elevated signal detected.",
    actionDetail: "Continue using normal verification habits when context changes.",
  },
];

function modeFor(stage: "ready" | "scanning" | "complete", verdict: Verdict): SignalMode {
  if (stage === "scanning") return "beam";
  if (stage === "complete") return verdict === "clear" ? "resolve" : "split";
  return "coherent";
}

export default function HackathonDemo() {
  const [selectedId, setSelectedId] = useState("urgency");
  const [stage, setStage] = useState<"ready" | "scanning" | "complete">("ready");
  const timerRef = useRef<number | null>(null);
  const selected = demoCases.find(demoCase => demoCase.id === selectedId) ?? demoCases[0];

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const selectCase = (id: string) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setSelectedId(id);
    setStage("ready");
  };

  const analyze = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setStage("scanning");
    timerRef.current = window.setTimeout(() => {
      setStage("complete");
      timerRef.current = null;
    }, 1350);
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
              <span className={`case-dot case-dot--${demoCase.verdict}`} />
              <span><b>{demoCase.label}</b><small>{demoCase.tag}</small></span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          ))}
          <p className="demo-cases__note">Fictional hackathon cases. No message content is transmitted by this demo.</p>
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

        <article className={`demo-read demo-read--${stage} demo-read--${selected.verdict}`} aria-live="polite">
          <div className="demo-read__visual" aria-hidden="true"><CinematicSignalField mode={modeFor(stage, selected.verdict)} /></div>
          <div className="demo-read__head"><p className="demo-panel-label">03 / TWO-CHANNEL READ</p><span className="demo-read__state">{stage === "complete" ? selected.tag : stage === "scanning" ? "READING" : "READY"}</span></div>
          {stage === "ready" && <div className="demo-read__empty"><Sparkles size={20} /><p>Select a case and start the read. The evidence channels will resolve here.</p></div>}
          {stage === "scanning" && <div className="demo-read__empty"><LoaderCircle className="demo-spin" size={21} /><p>Tracing sender identity, route behavior, and manipulation cues.</p></div>}
          {stage === "complete" && <div className="demo-evidence">
            <section className="evidence-channel evidence-channel--technical"><p>TECHNICAL SIGNALS</p>{selected.technical.map(signal => <span key={signal}><Check size={12} />{signal}</span>)}</section>
            <section className="evidence-channel evidence-channel--human"><p>HUMAN SIGNALS</p>{selected.human.map(signal => <span key={signal}><Check size={12} />{signal}</span>)}</section>
            <section className="demo-action"><div>{selected.verdict === "clear" ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}</div><p className="demo-panel-label">RECOMMENDED RESPONSE</p><h2>{selected.action}</h2><p>{selected.actionDetail}</p></section>
          </div>}
        </article>
      </section>

      <section className="demo-proof">
        <p className="eyebrow">[ WHAT THE JUDGES ARE SEEING ]</p>
        <div className="demo-proof__flow"><span>Browser extension</span><i /><span>Two-channel signal engine</span><i /><span>Explainable response</span></div>
        <div className="demo-proof__summary" aria-live="polite">
          <span><b>Extension event</b>{stage === "ready" ? "Ready" : stage === "scanning" ? "Scan requested" : "Scan complete"}</span>
          <span><b>Evidence split</b>{stage === "complete" ? `${selected.technical.length} technical · ${selected.human.length} human` : "Pending analysis"}</span>
          <span><b>Response</b>{stage === "complete" ? selected.action : "Waiting for the read"}</span>
        </div>
        <p>One message becomes evidence a person can understand and act on—without reducing the decision to an opaque risk score.</p>
      </section>
    </main>
  );
}
