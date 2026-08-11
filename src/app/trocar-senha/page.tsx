"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrotoLogo } from "@/components/Logo";

export default function TrocarSenhaPage() {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (p1.length < 6) return setErr("A senha deve ter ao menos 6 caracteres.");
    if (p1 !== p2) return setErr("As senhas não coincidem.");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: p1 }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "Não foi possível trocar a senha.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const input =
    "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center py-10">
      <div className="mb-6 flex justify-center">
        <BrotoLogo />
      </div>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-lg font-bold text-gray-900">Defina sua senha</h1>
        <p className="mb-5 mt-1 text-sm text-gray-500">
          Por segurança, crie uma nova senha para continuar.
        </p>
        <form onSubmit={salvar} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700">
            Nova senha
            <input type="password" className={input} value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="new-password" required />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Repita a senha
            <input type="password" className={input} value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" required />
          </label>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={loading} className="mt-1 w-full rounded-xl bg-brand py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
            {loading ? "Salvando…" : "Salvar e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
