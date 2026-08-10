"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("proteger-pdf")!;

export default function Page() {
  const [password, setPassword] = useState("");

  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF"
      buttonLabel="Proteger PDF"
      responseKind="download"
      controls={
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Defina uma senha"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
        </div>
      }
      build={(files) => {
        if (!password) return { error: "Informe uma senha." };
        const fd = new FormData();
        fd.append("file", files[0]);
        fd.append("password", password);
        return { url: "/api/protect", init: { body: fd }, downloadName: "protegido.pdf" };
      }}
    />
  );
}
