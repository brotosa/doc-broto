"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { useServerAction } from "@/lib/useServerAction";

const tool = getTool("html-para-pdf")!;

export default function Page() {
  const [url, setUrl] = useState("");
  const { busy, error, submit, setError } = useServerAction();

  const run = async () => {
    if (!url.trim()) {
      setError("Informe uma URL.");
      return;
    }
    await submit(
      "/api/html-to-pdf",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      },
      { kind: "download", filename: "pagina.pdf" }
    );
  };

  return (
    <ToolShell tool={tool}>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">URL da página</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com.br"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Gerando..." : "Converter para PDF"}
      </button>
    </ToolShell>
  );
}
