"use client";

import { useState } from "react";
import { downloadBlob } from "./download";

type Options =
  | { kind: "download"; filename: string }
  | { kind: "json" };

/**
 * Posts a request to a backend route. For "download" it saves the returned
 * file; for "json" it returns the parsed `result` string. Surfaces API errors.
 */
export function useServerAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const submit = async (url: string, init: RequestInit, opts: Options) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(url, { method: "POST", ...init });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Erro ${res.status} ao processar.`);
        return;
      }
      if (opts.kind === "download") {
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
        const name = match ? decodeURIComponent(match[1].replace(/"/g, "")) : opts.filename;
        downloadBlob(blob, name, blob.type || "application/octet-stream");
      } else {
        const data = await res.json();
        setResult(data.result ?? "");
      }
    } catch (e) {
      setError("Falha de rede ao processar o arquivo.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, result, submit, setError };
}
