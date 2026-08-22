import type { MockInboxEvent } from "@shared/agent";
import type { ScanRequest } from "@shared/scan";

const simulatedFileHash = (character: string) => character.repeat(64);

export const mockInboxEvents: readonly MockInboxEvent[] = [
  {
    id: "mock-account-review",
    sender: "Account Review <notice@security-review.invalid>",
    subject: "Your Microsoft account will be suspended",
    body: "Urgent: verify your account before today to avoid suspension. Do not use the normal approval process. Review the request at https://ultrasoniccarwash.com/account-review.",
    timestampLabel: "10:41",
    url: "https://ultrasoniccarwash.com/account-review",
    sourceContext: "hero_message",
  },
  {
    id: "mock-invoice",
    sender: "Billing Desk <billing@invoice-review.invalid>",
    subject: "Invoice #48391 attached",
    body: "Please review the attached invoice immediately and confirm payment before end of day.",
    timestampLabel: "10:39",
    file: { name: "Invoice_48391.pdf.exe", size: 18432, mimeType: "application/octet-stream", sha256: simulatedFileHash("b") },
    sourceContext: "hero_file",
  },
  {
    id: "mock-delivery",
    sender: "Parcel Updates <dispatch@parcel-alert.invalid>",
    subject: "Your package delivery requires payment",
    body: "Your parcel is on hold. Pay the redelivery fee now or your package will be returned. Use https://delivery-payment.example/confirm.",
    url: "https://delivery-payment.example/confirm",
    timestampLabel: "10:37",
    sourceContext: "hero_message",
  },
  {
    id: "mock-newsletter",
    sender: "People Operations <people@company.example>",
    subject: "Weekly company newsletter",
    body: "This week: upcoming town hall details, benefits reminders, and recognition updates. No action is required.",
    timestampLabel: "10:34",
    sourceContext: "hero_message",
  },
  {
    id: "mock-password-reset",
    sender: "Identity Service <identity@company.example>",
    subject: "Password reset request",
    body: "A password reset was requested. If this was you, use your usual company bookmark to finish the process. If not, contact IT through the directory.",
    timestampLabel: "10:31",
    sourceContext: "hero_message",
  },
];

export function getMockInboxEvent(eventId: string) {
  return mockInboxEvents.find(event => event.id === eventId);
}

export function mockEventToScanRequest(event: MockInboxEvent): ScanRequest {
  return {
    url: event.url,
    pastedMessage: `${event.subject}\n\n${event.body}`,
    file: event.file,
    sourceContext: event.sourceContext,
    persistMetadata: true,
  };
}

export function mockEventTarget(event: MockInboxEvent) {
  if (event.url) {
    try {
      return new URL(event.url).hostname;
    } catch {
      return "Simulated link";
    }
  }
  return event.file?.name ?? "Simulated message";
}
