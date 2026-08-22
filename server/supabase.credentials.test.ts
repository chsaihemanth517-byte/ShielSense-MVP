import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe("Supabase server credentials", () => {
  it.skipIf(!supabaseUrl || !serviceRoleKey)("are accepted by the Supabase REST endpoint", async () => {
    const response = await fetch(`${supabaseUrl?.replace(/\/$/, "")}/rest/v1/`, {
      headers: {
        apikey: serviceRoleKey ?? "",
        Authorization: `Bearer ${serviceRoleKey ?? ""}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  }, 8000);
});
