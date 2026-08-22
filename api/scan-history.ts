import type { IncomingMessage, ServerResponse } from "node:http";
import { handleScanHistoryRequest } from "../server/routes/scan";

export default async function handler(request: IncomingMessage & { query?: Record<string, string | string[] | undefined> }, response: ServerResponse & { status: (status: number) => unknown; json: (body: unknown) => unknown }) {
  return handleScanHistoryRequest(request, response);
}
