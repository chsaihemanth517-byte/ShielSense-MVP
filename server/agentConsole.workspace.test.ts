import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const consoleSource = readFileSync(new URL("../client/src/pages/AgentConsole.tsx", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("./routes/agent.ts", import.meta.url), "utf8");

describe("Agent Console demo integration", () => {
  it("labels the workspace as a controlled demo and exposes the expected agent lifecycle controls", () => {
    expect(consoleSource).toContain("DEMO MODE");
    expect(consoleSource).toContain("controlled mock-inbox events only");
    expect(consoleSource).toContain("Start agent");
    expect(consoleSource).toContain("Pause");
    expect(consoleSource).toContain("Resume");
    expect(consoleSource).toContain("Stop");
    expect(consoleSource).toContain("Reset");
  });

  it("connects the mock inbox to the shared scan route, incident report surface, evidence, and grounded chat", () => {
    expect(consoleSource).toContain('fetch("/api/agent/scan"');
    expect(consoleSource).toContain("INCIDENT REPORTS");
    expect(consoleSource).toContain("EVIDENCE");
    expect(consoleSource).toContain("AIChatBox");
    expect(consoleSource).toContain('fetch("/api/chat"');
    expect(routeSource).toContain('app.all("/api/agent/scan"');
    expect(routeSource).toContain('app.all("/api/chat"');
  });

  it("reads deployed API failures safely instead of assuming every response contains JSON", () => {
    expect(consoleSource).toContain("async function readApiPayload");
    expect(consoleSource).toContain("await response.text()");
    expect(consoleSource).toContain("instead of JSON");
    expect(consoleSource).not.toContain("await response.json()");
  });
});
