import { describe, expect, it } from "vitest";
import { checkThreatFoxDomain } from "./services/threat-intelligence/threatfox";
import { checkURLhaus } from "./services/threat-intelligence/urlhaus";

describe("threat-intelligence provider credentials", () => {
  it.skipIf(!process.env.URLHAUS_AUTH_KEY)("authenticates an inert URLhaus lookup", async () => {
    const result = await checkURLhaus("https://example.com/");
    expect(result.status).not.toBe("unavailable");
    expect(result.errorCode).toBeUndefined();
  }, 8000);

  it.skipIf(!process.env.THREATFOX_AUTH_KEY)("authenticates an inert ThreatFox lookup", async () => {
    const result = await checkThreatFoxDomain("example.com");
    expect(result.status).not.toBe("unavailable");
    expect(result.errorCode).toBeUndefined();
  }, 8000);
});
