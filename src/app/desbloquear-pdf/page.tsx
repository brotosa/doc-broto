"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("desbloquear-pdf")!;

export default function Page() {
  const [password, setPassword] = useState("");

  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF protegido"
      buttonLabel="Desbloquear PDF"
      responseKind="download"
      controls={
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Senha atual (se houver)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha do PDF"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            <strong>Só restrições</strong> (o PDF abre normalmente, mas bloqueia
            imprimir/copiar): removemos sem precisar de senha.{" "}
            <strong>Senha de abertura</strong> (pede senha para abrir): informe a
            senha acima. Se você não tem a senha, o conteúdo é criptografado e{" "}
            <strong>não há como recuperá-lo</strong> — peça o arquivo original a
            quem o enviou.
          </p>
        </div>
      }
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        fd.append("password", password);
        return { url: "/api/unlock", init: { body: fd }, downloadName: "desbloqueado.pdf" };
      }}
    />
  );
}
