import { describe, expect, it } from "vitest";
import { extractFirstHttpUrl } from "../client/src/lib/urlExtraction";
import { scanRequestSchema } from "../shared/scan";
import { checkThreatIntelligence } from "./services/threat-intelligence";

describe("pasted-message URL extraction", () => {
  it("extracts an explicit HTTP(S) URL and trims common surrounding punctuation", () => {
    expect(extractFirstHttpUrl("Please inspect (https://example.test/path?ref=mail). Thank you.")).toBe("https://example.test/path?ref=mail");
  });

  it("ignores text without an explicit valid HTTP(S) link", () => {
    expect(extractFirstHttpUrl("Please review the portal when you have time.")).toBeUndefined();
  });

  it("keeps the detected URL and pasted message together for the existing scan providers and human-signal engine", () => {
    const url = extractFirstHttpUrl("Urgent: confirm access at https://secure-review.example/verify before today.");
    const request = scanRequestSchema.parse({
      url,
      pastedMessage: "Urgent: confirm access at https://secure-review.example/verify before today.",
      sourceContext: "hero_message",
      persistMetadata: true,
    });

    expect(request.url).toBe("https://secure-review.example/verify");
    expect(request.pastedMessage).toContain("Urgent");
  });

  it("keeps message-only scans truthful by skipping URLhaus and ThreatFox when no link exists", async () => {
    const request = scanRequestSchema.parse({
      pastedMessage: "Urgent: please verify your account before today.",
      sourceContext: "hero_message",
    });
    const providers = await checkThreatIntelligence(request);

    expect(providers).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "URLhaus", status: "skipped", found: false }),
      expect.objectContaining({ source: "ThreatFox", status: "skipped", found: false }),
    ]));
  });
});
