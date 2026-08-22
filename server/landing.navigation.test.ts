import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("landing experience navigation", () => {
  it("keeps Live Reading primary while exposing Agent Console and Demo route links", () => {
    expect(landingSource).toContain('className="site-actions"');
    expect(landingSource).toContain('href="/agent"');
    expect(landingSource).toContain('href="/demo"');
    expect(landingSource).toContain('href="/live-read"');
    expect(landingSource).toContain("Agent Console");
    expect(landingSource).toContain("View Demo");
  });
});
