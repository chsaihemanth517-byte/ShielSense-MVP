import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { saveWaitlistEmailMock } = vi.hoisted(() => ({
  saveWaitlistEmailMock: vi.fn(),
}));

vi.mock("./db", () => ({
  saveWaitlistEmail: saveWaitlistEmailMock,
}));

import { appRouter } from "./routers";

function createPublicCaller() {
  const ctx = {
    user: null,
    req: {},
    res: {},
  } as TrpcContext;

  return appRouter.createCaller(ctx);
}

describe("waitlist.join", () => {
  beforeEach(() => {
    saveWaitlistEmailMock.mockReset();
  });

  it("normalizes an email and confirms a new waitlist place", async () => {
    saveWaitlistEmailMock.mockResolvedValue("created");
    const caller = createPublicCaller();

    await expect(caller.waitlist.join({ email: "  READER@Example.com " })).resolves.toEqual({ status: "created" });
    expect(saveWaitlistEmailMock).toHaveBeenCalledWith("reader@example.com");
  });

  it("returns a friendly duplicate state without creating another registration", async () => {
    saveWaitlistEmailMock.mockResolvedValue("already_registered");
    const caller = createPublicCaller();

    await expect(caller.waitlist.join({ email: "reader@example.com" })).resolves.toEqual({
      status: "already_registered",
    });
  });

  it("rejects malformed email input before accessing the database", async () => {
    const caller = createPublicCaller();

    await expect(caller.waitlist.join({ email: "not-an-email" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(saveWaitlistEmailMock).not.toHaveBeenCalled();
  });
});
