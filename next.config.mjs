import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Turbopack doesn't pick up a stray
  // package-lock.json from a parent directory (C:\Users\nhlar).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
