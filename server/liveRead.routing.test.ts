import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("Get ShieldSense live-reading route", () => {
  it("links the visible landing CTA to the registered live-reading workspace", () => {
    expect(homeSource).toContain('<a className="top-cta" href="/live-read">');
    expect(homeSource).toContain("Get ShieldSense");
    expect(appSource).toContain('<Route path={"/live-read"} component={LiveReadWorkspace} />');
  });
});
