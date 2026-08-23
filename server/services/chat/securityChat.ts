import type { SecurityChatRequest, SecurityChatResponse } from "../../../shared/agent.js";

function providerSummary(request: SecurityChatRequest) {
  return request.scan?.providers.map(provider => `${provider.source}: ${provider.found ? "match found" : provider.status.replaceAll("_", " ")}`).join("; ") ?? "No provider lookup has run.";
}

export function answerGroundedSecurityQuestion(request: SecurityChatRequest): SecurityChatResponse {
  const scan = request.scan;
  if (!scan) {
    return {
      grounded: false,
      answer: "I need a ShieldSense scan before I can assess this. Paste a URL, message, or file metadata in Live Reading, or select a completed simulated event.",
    };
  }

  const question = request.question.toLowerCase();
  const target = request.target ? ` for ${request.target}` : "";
  const evidence = scan.signals.map(signal => signal.name).slice(0, 4);
  const providerDetail = providerSummary(request);
  let answer: string;

  if (/provider|threat intelligence|urlhaus|threatfox|found/.test(question)) {
    answer = `Threat-intelligence status${target}: ${providerDetail}. These are the recorded results from this scan; a provider marked unavailable or skipped is not treated as a clean result.`;
  } else if (/why|detect|danger|score|risk/.test(question)) {
    answer = `ShieldSense rated this ${scan.riskScore}/100 (${scan.riskLevel}, ${scan.verdict.replaceAll("_", " ")})${target}. Recorded evidence: ${evidence.length ? evidence.join(", ") : "no elevated local signals"}. Provider status: ${providerDetail}.`;
  } else if (/what should|should i|open|safe|phish/.test(question)) {
    answer = `The current result is ${scan.riskLevel.toUpperCase()} — ${scan.verdict.replaceAll("_", " ")}${target}. Recommended action: ${scan.recommendations[0]} ShieldSense's simulated response is ${scan.simulatedResponse.label}; no real browser, mailbox, network, or file action is performed.`;
  } else {
    answer = `This answer is grounded in scan ${scan.scanId.slice(0, 8)}${target}: ${scan.explanation} Ask why it was scored this way, what was detected, whether a provider found a match, or what to do next.`;
  }

  return { answer, grounded: true, scanId: scan.scanId };
}
