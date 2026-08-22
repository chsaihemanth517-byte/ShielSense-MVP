import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIChatBox, type Message as ChatMessage } from "@/components/AIChatBox";
import { Activity, ArrowLeft, Bot, CirclePause, Copy, FileText, LoaderCircle, Play, RotateCcw, ShieldAlert, ShieldCheck, Square, TerminalSquare } from "lucide-react";
import type { AgentActivity, AgentState, IncidentReport } from "@shared/agent";
import type { ScanResult } from "@shared/scan";

type InboxPreview = { id: string; sender: string; subject: string; snippet: string; time: string; hasFile?: boolean; hasLink?: boolean };
type AgentOutcome = { event: InboxPreview; result: ScanResult; incident?: IncidentReport; activity: AgentActivity[] };

const controlledInbox: InboxPreview[] = [
  { id: "mock-account-review", sender: "Account Review", subject: "Your Microsoft account will be suspended", snippet: "Urgent verification request with a controlled demo link.", time: "10:41", hasLink: true },
  { id: "mock-invoice", sender: "Billing Desk", subject: "Invoice #48391 attached", snippet: "A metadata-only attachment simulation.", time: "10:39", hasFile: true },
  { id: "mock-delivery", sender: "Parcel Updates", subject: "Your package delivery requires payment", snippet: "Urgency and payment pressure in a simulated message.", time: "10:37", hasLink: true },
  { id: "mock-newsletter", sender: "People Operations", subject: "Weekly company newsletter", snippet: "Routine operational newsletter with no action requested.", time: "10:34" },
  { id: "mock-password-reset", sender: "Identity Service", subject: "Password reset request", snippet: "A controlled identity-notice scenario.", time: "10:31" },
];

function timeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function reportText(report: IncidentReport) {
  return [
    "SHIELDSENSE INCIDENT REPORT",
    "",
    `Incident: ${report.incidentId}`,
    `Time: ${new Date(report.createdAt).toLocaleString()}`,
    `Target: ${report.target}`,
    `Severity: ${report.riskLevel.toUpperCase()}`,
    `Verdict: ${report.verdict.replaceAll("_", " ")}`,
    `Risk score: ${report.riskScore}/100`,
    "",
    "THREAT INTELLIGENCE",
    ...report.providerFindings.map(provider => `• ${provider.source}: ${provider.found ? "match found" : provider.status} — ${provider.description ?? "No additional detail"}`),
    "",
    "DETECTED SIGNALS",
    ...[...report.technicalSignals, ...report.humanSignals, ...report.fileIndicators].map(signal => `• ${signal}`),
    "",
    `SIMULATED RESPONSE: ${report.simulatedAction}`,
    "RECOMMENDED ACTION",
    ...report.recommendations.map(recommendation => `• ${recommendation}`),
    "",
    report.disclaimer,
  ].join("\n");
}

export default function AgentConsole() {
  const [agentState, setAgentState] = useState<AgentState>("stopped");
  const [outcomes, setOutcomes] = useState<AgentOutcome[]>([]);
  const [activity, setActivity] = useState<AgentActivity[]>([]);
  const [selected, setSelected] = useState<AgentOutcome | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const queueRef = useRef(0);
  const processingRef = useRef(false);

  const stats = useMemo(() => ({
    processed: outcomes.length,
    threats: outcomes.filter(outcome => outcome.result.riskLevel !== "low").length,
    blocked: outcomes.filter(outcome => ["block", "quarantine"].includes(outcome.result.simulatedResponse.action)).length,
    warned: outcomes.filter(outcome => outcome.result.simulatedResponse.action === "warn").length,
  }), [outcomes]);
  const incidents = useMemo(() => outcomes.flatMap(outcome => outcome.incident ? [outcome.incident] : []), [outcomes]);

  const nextEvent = useCallback(() => {
    const event = controlledInbox[queueRef.current % controlledInbox.length];
    queueRef.current += 1;
    return event;
  }, []);

  const processEvent = useCallback(async (event: InboxPreview) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setActivity(current => [{ id: `local-${Date.now()}`, timestamp: new Date().toISOString(), level: "info" as const, message: `Queueing simulated event: ${event.subject}` }, ...current].slice(0, 24));
    try {
      const response = await fetch("/api/agent/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: event.id }) });
      const payload = await response.json() as Omit<AgentOutcome, "event"> | { message?: string };
      if (!response.ok || !("result" in payload)) throw new Error("message" in payload ? payload.message : "The simulated event did not return a scan result.");
      const outcome: AgentOutcome = { ...payload, event };
      setOutcomes(current => [outcome, ...current.filter(item => item.result.scanId !== outcome.result.scanId)].slice(0, 12));
      setActivity(current => [...outcome.activity, ...current].slice(0, 24));
      setSelected(outcome);
    } catch (error) {
      setActivity(current => [{ id: `error-${Date.now()}`, timestamp: new Date().toISOString(), level: "critical" as const, message: error instanceof Error ? error.message : "Simulated agent scan failed." }, ...current].slice(0, 24));
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    if (agentState !== "active") return;
    const interval = window.setInterval(() => void processEvent(nextEvent()), 9000);
    return () => window.clearInterval(interval);
  }, [agentState, nextEvent, processEvent]);

  const startAgent = () => {
    setAgentState("active");
    void processEvent(nextEvent());
  };
  const stopAgent = () => setAgentState("stopped");
  const resetAgent = () => {
    setAgentState("stopped");
    queueRef.current = 0;
    setOutcomes([]);
    setActivity([]);
    setSelected(null);
    setChatMessages([]);
  };

  const askChat = async (question: string) => {
    const currentScan = selected?.result;
    setChatMessages(current => [...current, { role: "user", content: question }]);
    setChatLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, scan: currentScan, target: selected?.incident?.target }) });
      const payload = await response.json() as { answer?: string; message?: string };
      setChatMessages(current => [...current, { role: "assistant", content: response.ok && payload.answer ? payload.answer : payload.message ?? "ShieldSense could not prepare a grounded answer." }]);
    } catch {
      setChatMessages(current => [...current, { role: "assistant", content: "ShieldSense could not prepare a grounded answer. Select a completed simulated event and try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const copySelectedReport = async () => {
    if (!selected?.incident || !navigator.clipboard) return;
    await navigator.clipboard.writeText(reportText(selected.incident));
  };

  return (
    <main className="agent-console">
      <header className="agent-console__header">
        <a className="brand" href="/" aria-label="Return to ShieldSense home"><span className="brand__mark" aria-hidden="true"><span /><span /></span><span>SHIELDSENSE</span></a>
        <div className="agent-console__title"><span>AGENT CONSOLE</span><small>CONTROLLED DEMO ENVIRONMENT</small></div>
        <div className="agent-console__header-links"><a href="/live-read">Live Reading</a><a href="/demo">Pitch demo</a><a href="/">Product site <ArrowLeft size={13} /></a></div>
      </header>

      <section className="agent-console__notice"><ShieldAlert size={15} /><p><strong>DEMO MODE</strong> — ShieldSense is monitoring controlled mock-inbox events only. It does not watch your real email, browser, files, or private applications.</p></section>

      <section className="agent-console__overview" aria-label="Simulated agent status">
        <article className={`agent-console__agent-card agent-console__agent-card--${agentState}`}><div><span>SHIELDSENSE AGENT</span><strong><i /> {agentState === "active" ? "ACTIVE" : agentState === "paused" ? "PAUSED" : "STOPPED"}</strong></div><Bot size={30} aria-hidden="true" /><p>Monitoring: <b>Mock Inbox</b></p><div className="agent-console__controls">
          {agentState === "stopped" && <button type="button" onClick={startAgent} disabled={isProcessing}><Play size={14} /> Start agent</button>}
          {agentState === "active" && <button type="button" onClick={() => setAgentState("paused")}><CirclePause size={14} /> Pause</button>}
          {agentState === "paused" && <button type="button" onClick={() => setAgentState("active")}><Play size={14} /> Resume</button>}
          {agentState !== "stopped" && <button type="button" className="agent-console__button--quiet" onClick={stopAgent}><Square size={12} /> Stop</button>}
          <button type="button" className="agent-console__button--quiet" onClick={resetAgent}><RotateCcw size={13} /> Reset</button>
        </div></article>
        <article className="agent-console__stat"><span>EVENTS SCANNED</span><strong>{stats.processed}</strong><small>simulated only</small></article>
        <article className="agent-console__stat agent-console__stat--risk"><span>THREATS DETECTED</span><strong>{stats.threats}</strong><small>medium risk and above</small></article>
        <article className="agent-console__stat"><span>SIMULATED BLOCKED</span><strong>{stats.blocked}</strong><small>block / quarantine</small></article>
        <article className="agent-console__stat"><span>SIMULATED WARNED</span><strong>{stats.warned}</strong><small>review recommended</small></article>
      </section>

      <section className="agent-console__grid">
        <aside className="agent-console__inbox"><div className="agent-console__section-head"><span>[ MOCK INBOX ]</span><small>{controlledInbox.length} CONTROLLED EVENTS</small></div>{controlledInbox.map(event => <button key={event.id} type="button" className={selected?.event.id === event.id ? "is-selected" : undefined} onClick={() => void processEvent(event)} disabled={isProcessing}><div><b>{event.sender}</b><time>{event.time}</time></div><strong>{event.subject}</strong><p>{event.snippet}</p><span>{event.hasLink ? "LINK" : ""} {event.hasFile ? "FILE METADATA" : ""}</span></button>)}</aside>

        <section className="agent-console__center"><div className="agent-console__section-head"><span>[ LIVE AGENT ACTIVITY ]</span><small>{isProcessing ? "PROCESSING EVENT" : agentState.toUpperCase()}</small></div><div className="agent-console__activity" aria-live="polite">{activity.length ? activity.map(item => <button type="button" key={item.id} className={`agent-console__activity-row agent-console__activity-row--${item.level}`} onClick={() => { const match = outcomes.find(outcome => outcome.result.scanId === item.scanId); if (match) setSelected(match); }}><time>{timeLabel(item.timestamp)}</time><b>{item.level.toUpperCase()}</b><span>{item.message}</span></button>) : <div className="agent-console__empty"><Activity size={22} /><p>Start the agent or choose a mock inbox event to create a controlled live reading.</p></div>}</div>
          {selected && <article className={`agent-console__scan-summary agent-console__scan-summary--${selected.result.riskLevel}`}><div><span>[ SELECTED READ ]</span><strong>{selected.result.riskScore}<small>/100</small></strong><p>{selected.result.riskLevel.toUpperCase()} · {selected.result.verdict.replaceAll("_", " ")}</p></div><div><b>SIMULATED · {selected.result.simulatedResponse.label}</b><p>{selected.result.explanation}</p><small>{selected.result.simulatedResponse.disclaimer}</small></div></article>}
        </section>

        <aside className="agent-console__reports"><div className="agent-console__section-head"><span>[ INCIDENT REPORTS ]</span><small>{incidents.length} GENERATED</small></div><div className="agent-console__report-list">{incidents.length ? incidents.map(report => <button type="button" key={report.incidentId} className={`agent-console__report-item agent-console__report-item--${report.riskLevel}`} onClick={() => setSelected(outcomes.find(outcome => outcome.result.scanId === report.scanId) ?? null)}><b>{report.riskLevel.toUpperCase()}</b><strong>{report.verdict.replaceAll("_", " ")}</strong><span>{report.riskScore}/100 · {new Date(report.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></button>) : <div className="agent-console__empty"><FileText size={22} /><p>High-risk simulated reads automatically create a privacy-safe incident report.</p></div>}</div>{selected?.incident && <div className="agent-console__report-detail"><span>{selected.incident.incidentId}</span><strong>{selected.incident.target}</strong><p>{selected.incident.providerFindings.map(provider => `${provider.source}: ${provider.found ? "match" : provider.status}`).join(" · ")}</p><div><button type="button" onClick={() => void copySelectedReport()}><Copy size={12} /> Copy report</button><button type="button" onClick={() => window.print()}><TerminalSquare size={12} /> Print</button></div></div>}</aside>
      </section>

      <section className="agent-console__bottom-grid">
        <article className="agent-console__evidence"><div className="agent-console__section-head"><span>[ EVIDENCE ]</span><small>{selected ? selected.result.scanId.slice(0, 8) : "NO SELECTION"}</small></div>{selected ? <><div className="agent-console__provider-grid">{selected.result.providers.map(provider => <div key={provider.source} className={provider.found ? "is-found" : `is-${provider.status}`}><b>{provider.source}</b><span>{provider.found ? "MATCH FOUND" : provider.status.replaceAll("_", " ")}</span><p>{provider.description}</p></div>)}</div><div className="agent-console__signal-columns"><section><b>TECHNICAL</b>{selected.result.signals.filter(signal => signal.channel === "technical").map(signal => <span key={signal.id}>✓ {signal.name}</span>)}</section><section><b>HUMAN</b>{selected.result.signals.filter(signal => signal.channel === "human").map(signal => <span key={signal.id}>✓ {signal.name}</span>)}</section></div></> : <div className="agent-console__empty"><ShieldCheck size={22} /><p>Select a simulated event to inspect evidence from the shared scan engine.</p></div>}</article>
        <article className="agent-console__chat"><div className="agent-console__section-head"><span>[ SHIELDSENSE CHAT ]</span><small>{selected ? "GROUNDED IN SELECTED READ" : "SCAN CONTEXT REQUIRED"}</small></div><AIChatBox messages={chatMessages} onSendMessage={askChat} isLoading={chatLoading} height="330px" placeholder="Ask about the selected simulated read…" emptyStateMessage={selected ? "Ask why this simulated event was flagged." : "Select a completed simulated read for grounded answers."} suggestedPrompts={["Is this safe?", "Why is this dangerous?", "What should I do?", "Was it found in threat intelligence?"]} /></article>
      </section>
    </main>
  );
}
