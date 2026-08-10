"use client";

// Centralised pdf.js loader so the worker is configured once.
import * as pdfjsLib from "pdfjs-dist";

// Use a bundled worker URL. Next/Turbopack resolves this to a static asset.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export { pdfjsLib };
