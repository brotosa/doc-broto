"use client";

import { useRef, useState } from "react";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";

const tool = getTool("assinar-certificado")!;
const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [cert, setCert] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [visible, setVisible] = useState(true);
  const [page, setPage] = useState(1);
  const [corner, setCorner] = useState("br");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const certRef = useRef<HTMLInputElement>(null);

  const onSubmit = async () => {
    setError(null);
    if (!files[0]) return setError("Envie o PDF a ser assinado.");
    if (!cert) return setError("Envie o certificado A1 (.pfx ou .p12).");
    if (!password) return setError("Informe a senha do certificado.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      fd.append("cert", cert);
      fd.append("password", password);
      fd.append("reason", reason);
      fd.append("location", location);
      fd.append("visible", String(visible));
      fd.append("page", String(page));
      fd.append("corner", corner);
      const res = await fetch("/api/sign-cert", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Erro ${res.status} ao assinar.`);
        return;
      }
      const blob = await res.blob();
      const filename = files[0].name.replace(/\.pdf$/i, "") + "-assinado.pdf";
      setPassword("");
      window.dispatchEvent(new CustomEvent("broto:result", { detail: { blob, filename } }));
    } catch {
      setError("Falha de rede ao assinar o arquivo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} accept="application/pdf" hint="Selecione o PDF a assinar" />

      <div className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
        {/* Certificado */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Certificado A1 (.pfx / .p12)</label>
          <input
            ref={certRef}
            type="file"
            accept=".pfx,.p12"
            onChange={(e) => setCert(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
          />
          {cert && <p className="mt-1 text-xs text-gray-500">Selecionado: {cert.name}</p>}
        </div>

        {/* Senha */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Senha do certificado</label>
          <input type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" placeholder="••••••••" />
        </div>

        {/* Motivo / Local */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Motivo (opcional)</label>
            <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: De acordo" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Local (opcional)</label>
            <input className={input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex.: São Paulo/SP" />
          </div>
        </div>

        {/* Assinatura visível */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Mostrar carimbo visível da assinatura na página
        </label>
        {visible && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Página do carimbo</label>
              <input type="number" min={1} className={input} value={page} onChange={(e) => setPage(Math.max(1, Number(e.target.value)))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Posição</label>
              <select className={input} value={corner} onChange={(e) => setCorner(e.target.value)}>
                <option value="br">Inferior direita</option>
                <option value="bl">Inferior esquerda</option>
                <option value="tr">Superior direita</option>
                <option value="tl">Superior esquerda</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-brand/5 p-4 text-xs text-gray-600">
        <b>ICP-Brasil (A1):</b> a assinatura é criptográfica no padrão <b>PAdES</b> e tem validade jurídica quando o
        certificado é ICP-Brasil. Seu certificado e a senha são usados <b>apenas para assinar</b> e não são
        armazenados. O resultado pode ser conferido em <b>validar.iti.gov.br</b> ou no Adobe Reader.
      </div>

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={busy || files.length === 0}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Assinando..." : "Assinar com certificado"}
      </button>
    </ToolShell>
  );
}
