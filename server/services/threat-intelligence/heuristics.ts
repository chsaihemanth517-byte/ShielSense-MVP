import type { ScanRequest, ThreatSignal } from "../../../shared/scan.js";

type UrlSignalRule = {
  id: string;
  name: string;
  severity: ThreatSignal["severity"];
  weight: number;
  description: string;
};

const SHORTENER_HOSTS = new Set(["bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "rb.gy"]);
const SUSPICIOUS_TLDS = new Set(["zip", "mov", "click", "top", "work", "gq", "tk", "country"]);
const REDIRECT_KEYS = new Set(["url", "redirect", "redirect_uri", "next", "continue", "return", "target", "dest", "destination"]);
const BRAND_ROOTS: Record<string, string[]> = {
  microsoft: ["microsoft.com", "office.com", "live.com"],
  google: ["google.com", "gmail.com"],
  paypal: ["paypal.com"],
  apple: ["apple.com", "icloud.com"],
  amazon: ["amazon.com", "amazon.in", "amazon.co.uk"],
};

const URL_RULES: Record<string, UrlSignalRule> = {
  insecure_protocol: { id: "insecure_protocol", name: "Unencrypted web address", severity: "medium", weight: 10, description: "The link uses HTTP rather than HTTPS." },
  raw_ip_host: { id: "raw_ip_host", name: "Raw IP address host", severity: "high", weight: 18, description: "The link uses an IP address instead of a recognizable domain." },
  suspicious_tld: { id: "suspicious_tld", name: "Unusual top-level domain", severity: "medium", weight: 8, description: "The domain uses a top-level domain frequently abused in low-trust campaigns." },
  excessive_subdomains: { id: "excessive_subdomains", name: "Excessive subdomain depth", severity: "medium", weight: 8, description: "The link uses several subdomains, which can obscure the actual destination." },
  long_url: { id: "long_url", name: "Unusually long link", severity: "low", weight: 5, description: "The link is unusually long and harder to inspect safely." },
  dense_query: { id: "dense_query", name: "Dense query parameters", severity: "medium", weight: 7, description: "The link includes many query parameters that can conceal a destination or tracking flow." },
  encoded_components: { id: "encoded_components", name: "Encoded URL components", severity: "medium", weight: 8, description: "The link contains multiple encoded components that reduce readability." },
  redirect_parameter: { id: "redirect_parameter", name: "Redirect parameter", severity: "medium", weight: 9, description: "The link includes a parameter commonly used to send visitors to another destination." },
  url_shortener: { id: "url_shortener", name: "URL shortener", severity: "medium", weight: 9, description: "The link uses a shortener, which hides the destination until it is expanded." },
  punycode_domain: { id: "punycode_domain", name: "Internationalized domain encoding", severity: "high", weight: 16, description: "The domain uses punycode, which can visually resemble a trusted domain." },
  credential_path: { id: "credential_path", name: "Credential-related destination", severity: "medium", weight: 8, description: "The link path contains account, sign-in, payment, or verification language." },
  brand_lookalike: { id: "brand_lookalike", name: "Brand-like domain structure", severity: "high", weight: 18, description: "The domain contains a familiar brand name but is not an expected brand domain." },
};

const TEXT_RULES = [
  { id: "urgency_language", name: "Urgency language", severity: "medium" as const, weight: 10, description: "The message pressures the reader to act quickly.", pattern: /\b(urgent|immediately|right away|within \d+ (minutes?|hours?)|before (?:noon|midnight|today)|act now|limited time)\b/i },
  { id: "threat_language", name: "Threat or loss language", severity: "medium" as const, weight: 10, description: "The message warns of a negative consequence to increase pressure.", pattern: /\b(suspend(?:ed)?|locked|disabled|terminated|lose access|penalty|avoid interruption)\b/i },
  { id: "authority_impersonation", name: "Authority framing", severity: "medium" as const, weight: 9, description: "The message invokes authority or an official identity to increase compliance.", pattern: /\b(ceo|director|finance team|it support|security team|human resources|administrator|compliance)\b/i },
  { id: "credential_request", name: "Credential request", severity: "high" as const, weight: 17, description: "The message asks the reader to verify, sign in, or provide account information.", pattern: /\b(verify (?:your )?account|sign in|login|password|one[- ]time code|security code|credential)\b/i },
  { id: "payment_request", name: "Payment request", severity: "high" as const, weight: 15, description: "The message asks for payment or financial action.", pattern: /\b(payment|invoice|wire transfer|bank details|gift card|refund)\b/i },
  { id: "procedure_bypass", name: "Procedure-bypass request", severity: "high" as const, weight: 16, description: "The message asks the reader to bypass normal verification steps.", pattern: /\b(don'?t tell|keep this confidential|skip (?:the )?approval|bypass|outside (?:the )?normal process)\b/i },
  { id: "reward_manipulation", name: "Reward or prize manipulation", severity: "medium" as const, weight: 9, description: "The message uses a reward or prize to encourage impulsive action.", pattern: /\b(prize|winner|reward|claim your|exclusive offer)\b/i },
];

const FILE_RULES = {
  executable_attachment: { id: "executable_attachment", name: "Executable or script attachment", severity: "high" as const, weight: 20, description: "The filename indicates an executable or script-capable attachment that should not be opened casually." },
  macro_enabled_document: { id: "macro_enabled_document", name: "Macro-enabled document", severity: "high" as const, weight: 16, description: "The filename indicates a document type that can contain embedded macros." },
  double_extension: { id: "double_extension", name: "Misleading double extension", severity: "critical" as const, weight: 25, description: "The filename uses a document-like extension before a second executable extension, which can obscure its actual type." },
  unsupported_attachment: { id: "unsupported_attachment", name: "Unsupported dynamic attachment type", severity: "medium" as const, weight: 12, description: "ShieldSense can only perform static metadata checks on this attachment type; it does not execute or open files." },
  file_type_mismatch: { id: "file_type_mismatch", name: "Filename and MIME type do not align", severity: "medium" as const, weight: 10, description: "The browser-reported MIME type does not align with the filename extension. MIME values can be spoofed, so this is a cautionary signal rather than proof." },
  unusually_large_attachment: { id: "unusually_large_attachment", name: "Unusually large attachment", severity: "low" as const, weight: 4, description: "The attachment is large enough to make quick manual inspection less practical." },
};

const EXECUTABLE_EXTENSIONS = new Set(["exe", "dll", "scr", "msi", "bat", "cmd", "ps1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta", "jar", "app", "apk"]);
const MACRO_EXTENSIONS = new Set(["docm", "dotm", "xlsm", "xltm", "xlsb", "pptm", "potm", "ppsm"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods", "odp"]);

function makeSignal(rule: UrlSignalRule | (typeof TEXT_RULES)[number], channel: ThreatSignal["channel"], evidence?: string): ThreatSignal {
  return { id: rule.id, channel, source: "ShieldSense Heuristics", name: rule.name, severity: rule.severity, description: rule.description, evidence, weight: rule.weight };
}

function hostnameFromInput(request: ScanRequest): string | null {
  if (request.url) {
    try {
      return new URL(request.url).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
  return request.domain?.toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? null;
}

function truncatedMatch(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

function looksLikeIpAddress(hostname: string) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^\[[0-9a-f:]+\]$/i.test(hostname);
}

function rootLooksOfficial(hostname: string, allowedRoots: string[]) {
  return allowedRoots.some(root => hostname === root || hostname.endsWith(`.${root}`));
}

export function runUrlHeuristics(request: ScanRequest): ThreatSignal[] {
  const hostname = hostnameFromInput(request);
  const signals: ThreatSignal[] = [];
  if (!hostname) return signals;

  let parsedUrl: URL | null = null;
  if (request.url) {
    try {
      parsedUrl = new URL(request.url);
    } catch {
      return signals;
    }
  }

  if (parsedUrl?.protocol === "http:") signals.push(makeSignal(URL_RULES.insecure_protocol, "technical", "http://"));
  if (looksLikeIpAddress(hostname)) signals.push(makeSignal(URL_RULES.raw_ip_host, "technical", hostname));
  if (hostname.includes("xn--")) signals.push(makeSignal(URL_RULES.punycode_domain, "technical", hostname));

  const parts = hostname.split(".");
  const tld = parts.at(-1);
  if (tld && SUSPICIOUS_TLDS.has(tld)) signals.push(makeSignal(URL_RULES.suspicious_tld, "technical", `.${tld}`));
  if (parts.length > 4) signals.push(makeSignal(URL_RULES.excessive_subdomains, "technical", `${parts.length - 2} subdomains`));

  for (const [brand, roots] of Object.entries(BRAND_ROOTS)) {
    if (hostname.includes(brand) && !rootLooksOfficial(hostname, roots)) {
      signals.push(makeSignal(URL_RULES.brand_lookalike, "technical", hostname));
      break;
    }
  }

  if (!parsedUrl) return signals;
  if (parsedUrl.href.length > 140) signals.push(makeSignal(URL_RULES.long_url, "technical", `${parsedUrl.href.length} characters`));
  if (parsedUrl.searchParams.size > 4) signals.push(makeSignal(URL_RULES.dense_query, "technical", `${parsedUrl.searchParams.size} parameters`));
  if ((parsedUrl.href.match(/%[0-9a-f]{2}/gi) ?? []).length >= 4) signals.push(makeSignal(URL_RULES.encoded_components, "technical", "multiple percent-encoded values"));
  if (Array.from(parsedUrl.searchParams.keys()).some(key => REDIRECT_KEYS.has(key.toLowerCase()))) signals.push(makeSignal(URL_RULES.redirect_parameter, "technical", "redirect-style query parameter"));
  if (SHORTENER_HOSTS.has(hostname)) signals.push(makeSignal(URL_RULES.url_shortener, "technical", hostname));
  if (/\b(login|signin|sign-in|verify|password|wallet|payment|invoice|account)\b/i.test(parsedUrl.pathname)) signals.push(makeSignal(URL_RULES.credential_path, "technical", parsedUrl.pathname.slice(0, 120)));

  return signals;
}

export function runTextHeuristics(request: ScanRequest): ThreatSignal[] {
  const text = [request.pageTitle, request.selectedText, request.pastedMessage].filter(Boolean).join("\n");
  if (!text) return [];

  return TEXT_RULES.flatMap(rule => {
    const match = text.match(rule.pattern);
    return match ? [makeSignal(rule, "human", truncatedMatch(match[0]))] : [];
  });
}

function extensionFromFilename(name: string) {
  return name.split(".").at(-1)?.toLowerCase() ?? "";
}

function inferredMimeCategory(extension: string) {
  if (extension === "pdf") return "application/pdf";
  if (["txt", "csv"].includes(extension)) return "text/";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "docm", "xlsm", "pptm"].includes(extension)) return "application/";
  return null;
}

export function runFileHeuristics(request: ScanRequest): ThreatSignal[] {
  if (!request.file) return [];
  const filename = request.file.name.trim();
  const extension = extensionFromFilename(filename);
  const segments = filename.toLowerCase().split(".").filter(Boolean);
  const penultimate = segments.at(-2) ?? "";
  const signals: ThreatSignal[] = [];

  if (EXECUTABLE_EXTENSIONS.has(extension) && (DOCUMENT_EXTENSIONS.has(penultimate) || MACRO_EXTENSIONS.has(penultimate))) {
    signals.push(makeSignal(FILE_RULES.double_extension, "technical", filename.slice(0, 120)));
  } else if (EXECUTABLE_EXTENSIONS.has(extension)) {
    signals.push(makeSignal(FILE_RULES.executable_attachment, "technical", `.${extension}`));
  } else if (MACRO_EXTENSIONS.has(extension)) {
    signals.push(makeSignal(FILE_RULES.macro_enabled_document, "technical", `.${extension}`));
  } else if (!DOCUMENT_EXTENSIONS.has(extension) && !["jpg", "jpeg", "png", "gif", "webp", "zip", "7z", "rar"].includes(extension)) {
    signals.push(makeSignal(FILE_RULES.unsupported_attachment, "technical", extension ? `.${extension}` : "no extension"));
  }

  const expectedMime = inferredMimeCategory(extension);
  const normalizedMime = request.file.mimeType.toLowerCase();
  if (expectedMime && normalizedMime !== "application/octet-stream" && !normalizedMime.startsWith(expectedMime)) {
    signals.push(makeSignal(FILE_RULES.file_type_mismatch, "technical", `${filename.slice(0, 64)} / ${normalizedMime.slice(0, 48)}`));
  }
  if (request.file.size >= 5 * 1024 * 1024) signals.push(makeSignal(FILE_RULES.unusually_large_attachment, "technical", `${Math.ceil(request.file.size / (1024 * 1024))} MB`));
  return signals;
}

export function runLocalHeuristics(request: ScanRequest): ThreatSignal[] {
  return [...runUrlHeuristics(request), ...runTextHeuristics(request), ...runFileHeuristics(request)];
}
