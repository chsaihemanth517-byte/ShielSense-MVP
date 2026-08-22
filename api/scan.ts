import { handleScanRequest } from "../server/routes/scan";

type VercelRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type VercelResponse = { status: (status: number) => VercelResponse; json: (body: unknown) => unknown; setHeader: (name: string, value: string) => void; end: () => void };

// Vercel discovers this file as the /api/scan serverless function. It shares the
// exact request validation and privacy controls used by local Express development.
export default async function handler(request: VercelRequest, response: VercelResponse) {
  return handleScanRequest(request, response);
}
