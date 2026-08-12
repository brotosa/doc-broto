"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { performDownload, formatBytes } from "@/lib/download";

type R = { blob: Blob; filename: string; path: string };

// Tela de "Arquivo pronto" — aparece ao concluir qualquer ferramenta.
export function ResultOverlay() {
  const [data, setData] = useState<R | null>(null);
  const router = useRouter();

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as R;
      if (d?.blob) setData(d);
    };
    window.addEventListener("broto:result", h as EventListener);
    return () => window.removeEventListener("broto:result", h as EventListener);
  }, []);

  if (!data) return null;

  // "Gerar novo": recarrega a MESMA ferramenta (form limpo).
  const gerarNovo = () => {
    window.location.href = data.path || "/";
  };
  // "Todas as ferramentas": fecha a tela e vai para a home.
  const irHome = () => {
    setData(null);
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4F5FB] px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-green/15 text-3xl font-bold text-brand-green">
          ✓
        </div>
        <h2 className="text-xl font-bold text-gray-900">Documento concluído!</h2>
        <p className="mx-auto mt-1 max-w-xs break-all text-sm text-gray-500">
          {data.filename} · {formatBytes(data.blob.size)}
        </p>

        <button
          onClick={() => performDownload(data.blob, data.filename)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark"
        >
          ⤓ Baixar arquivo
        </button>
        <button
          onClick={gerarNovo}
          className="mt-3 w-full rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          ↻ Gerar novo
        </button>

        <button onClick={irHome} className="mt-5 inline-block text-sm text-gray-400 transition hover:text-brand">
          ← Todas as ferramentas
        </button>
      </div>
    </div>
  );
}
