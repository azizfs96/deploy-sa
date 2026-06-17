import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: uses the adapter-free config so Prisma is never
// bundled into the Edge runtime. The `authorized` callback gates routes.
export const { auth: middleware } = NextAuth(authConfig);

// Protect the app shell; /login and /api/auth/* stay public.
export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/new"],
};
