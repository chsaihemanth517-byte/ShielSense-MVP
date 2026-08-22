import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { saveWaitlistEmail } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  waitlist: router({
    join: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email("Enter a valid email address.").max(320).transform(email => email.toLowerCase()),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          const status = await saveWaitlistEmail(input.email);
          return { status } as const;
        } catch (error) {
          console.error("[Waitlist] Failed to save signup", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "We could not save your place on the waitlist. Please try again.",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
