const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

function stripTrailingPunctuation(candidate: string) {
  return candidate.replace(/[.,;:!?]+$/g, "").replace(/[\])}]+$/g, "");
}

/**
 * Extracts the first valid explicit HTTP(S) URL from user-pasted text.
 * The returned URL is used only for the active scan request; it is never
 * added to scan history as raw content.
 */
export function extractFirstHttpUrl(text: string): string | undefined {
  const candidates = text.match(HTTP_URL_PATTERN) ?? [];
  for (const candidate of candidates) {
    const normalized = stripTrailingPunctuation(candidate);
    try {
      const url = new URL(normalized);
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch {
      // Continue to the next candidate rather than treating arbitrary text as a URL.
    }
  }
  return undefined;
}
