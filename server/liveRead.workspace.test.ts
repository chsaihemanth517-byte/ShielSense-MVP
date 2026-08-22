import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/LiveReadWorkspace.tsx"), "utf8");

describe("live-reading workspace accessibility contract", () => {
  it("keeps navigation and composer controls natively keyboard reachable", () => {
    expect(source).toContain('href="/" aria-label="Return to ShieldSense home"');
    expect(source).toContain('href="/"');
    expect(source).toContain('htmlFor="live-read-file"');
    expect(source).toContain('id="live-read-file"');
    expect(source).toContain('id="live-read-input"');
    expect(source).toContain('type="submit"');
  });

  it("uses an explicit form and a labelled textarea rather than a scripted click-only composer", () => {
    expect(source).toContain('<form className="live-read__composer" onSubmit={submitRead} noValidate>');
    expect(source).toContain('htmlFor="live-read-input"');
    expect(source).toContain('aria-label="Remove attached file"');
    expect(source).not.toContain('tabIndex={-1}');
  });

  it("shows detected-link eligibility and sends the extracted URL alongside message context", () => {
    expect(source).toContain('url: extractedUrl');
    expect(source).toContain('LINK DETECTED · URLhaus + ThreatFox will be queried for this active scan.');
    expect(source).toContain('LINK EXTRACTED · {submittedUrl}');
  });
});
