/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output produces a minimal self-contained server for Docker.
  output: "standalone",
  // Next.js 16 uses Turbopack by default. pdf.js runs only client-side
  // (see src/lib/pdfjs.ts, imported dynamically inside "use client" pages),
  // so its optional `canvas` Node dependency is never pulled into the server bundle.
  turbopack: {},
  // Allow large PDF/office uploads through Server Actions / route handlers.
  experimental: {
    serverActions: { bodySizeLimit: "100mb" },
  },
};

module.exports = nextConfig;
