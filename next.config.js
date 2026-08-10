/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 16 uses Turbopack by default. pdf.js runs only client-side
  // (see src/lib/pdfjs.ts, imported dynamically inside "use client" pages),
  // so its optional `canvas` Node dependency is never pulled into the server bundle.
  turbopack: {},
};

module.exports = nextConfig;
