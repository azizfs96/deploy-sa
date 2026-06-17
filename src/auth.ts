import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

/**
 * Full server-side Auth.js instance (Node runtime): the edge-safe config
 * plus the Prisma adapter that persists users, accounts and sessions.
 *
 * Middleware must NOT import this file — it uses `auth.config.ts` directly so
 * Prisma never gets bundled into the Edge runtime.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
});
