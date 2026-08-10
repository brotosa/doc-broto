"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("traduzir-pdf")!;

const TARGETS = [
  "português do Brasil",
  "inglês",
  "espanhol",
  "francês",
  "alemão",
  "chinês (simplificado)",
];

export default function Page() {
  const [target, setTarget] = useState(TARGETS[1]);

  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF"
      buttonLabel="Traduzir com IA"
      responseKind="json"
      controls={
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Traduzir para</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
            >
              {TARGETS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return { url: `/api/ai/traduzir?target=${encodeURIComponent(target)}`, init: { body: fd } };
      }}
    />
  );
}
