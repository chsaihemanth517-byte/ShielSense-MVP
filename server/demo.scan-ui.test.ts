import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/HackathonDemo.tsx", import.meta.url), "utf8");

describe("hackathon demo scan handling", () => {
  it("guides the judge to explicitly run the selected case and parses API failures safely", () => {
    expect(source).toContain("click <b>Analyze this message</b>");
    expect(source).toContain("async function readDemoScanResponse");
    expect(source).toContain("await response.text()");
    expect(source).toContain("instead of JSON");
    expect(source).not.toContain("await response.json()");
  });
});
