import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as Record<string, unknown>;
const runtimeModulePaths = [
  "../api/scan.ts",
  "../api/scan-history.ts",
  "../api/agent-scan.ts",
  "../api/agent/scan.ts",
  "../api/chat.ts",
  "../server/routes/scan.ts",
  "../server/routes/agent.ts",
  "../server/services/scan/scanService.ts",
  "../server/services/persistence/scanRepository.ts",
  "../server/services/risk/riskEngine.ts",
  "../server/services/agent/agentService.ts",
  "../server/services/agent/mockInbox.ts",
  "../server/services/chat/securityChat.ts",
  "../server/services/threat-intelligence/common.ts",
  "../server/services/threat-intelligence/heuristics.ts",
  "../server/services/threat-intelligence/index.ts",
  "../server/services/threat-intelligence/llm.ts",
  "../server/services/threat-intelligence/phishtank.ts",
  "../server/services/threat-intelligence/threatfox.ts",
  "../server/services/threat-intelligence/urlhaus.ts",
  "../server/_core/llm.ts",
  "../shared/agent.ts",
];

describe("Vercel API routing", () => {
  it("uses filesystem-first routing so serverless API endpoints are not consumed by the SPA fallback", () => {
    expect(config.rewrites).toBeUndefined();
    expect(config.routes).toEqual(expect.arrayContaining([expect.objectContaining({ handle: "filesystem" })]));
    expect((config.routes as Array<Record<string, string>>).at(-1)).toEqual({ src: "/(.*)", dest: "/index.html" });
  });

  it("configures the nested Agent Console function that matches the browser request path", () => {
    const functions = config.functions as Record<string, { maxDuration?: number }>;
    expect(functions["api/agent/scan.ts"]?.maxDuration).toBe(15);
  });

  it("uses explicit .js specifiers throughout the serverless scan and agent import graph", () => {
    for (const modulePath of runtimeModulePaths) {
      const source = readFileSync(new URL(modulePath, import.meta.url), "utf8");
      const relativeSpecifiers = [...source.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)].map(match => match[1]);
      expect(relativeSpecifiers.every(specifier => specifier.endsWith(".js")), modulePath).toBe(true);
    }
  });
});
