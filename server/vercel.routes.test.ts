import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as Record<string, unknown>;

describe("Vercel API routing", () => {
  it("uses filesystem-first routing so serverless API endpoints are not consumed by the SPA fallback", () => {
    expect(config.rewrites).toBeUndefined();
    expect(config.routes).toEqual(expect.arrayContaining([expect.objectContaining({ handle: "filesystem" })]));
    expect((config.routes as Array<Record<string, string>>).at(-1)).toEqual({ src: "/(.*)", dest: "/index.html" });
  });
});
