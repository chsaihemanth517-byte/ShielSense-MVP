import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("ShieldSense extension manifest", () => {
  it("uses Manifest V3 and minimal explicit-scan permissions", async () => {
    const file = await readFile(new URL("../extension/manifest.json", import.meta.url), "utf8");
    const manifest = JSON.parse(file) as { manifest_version: number; permissions: string[]; host_permissions: string[] };
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(["activeTab", "scripting", "storage", "contextMenus"]);
    expect(manifest.host_permissions.some(permission => permission.includes("<all_urls>"))).toBe(false);
  });
});
