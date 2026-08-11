"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrotoLogo } from "@/components/Logo";

type Msg = { t: "err" | "ok"; m: string } | null;

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Garante que o primeiro admin exista.
    fetch("/api/auth/bootstrap").catch(() => {});
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg({ t: "err", m: d.error || "Falha no login." });
        return;
      }
      router.push(d.mustChange ? "/trocar-senha" : "/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg({ t: "err", m: d.error || "Falha no cadastro." });
        return;
      }
      setMsg({ t: "ok", m: "Cadastro enviado! Aguarde a liberação do administrador para acessar." });
      setTab("entrar");
      setName("");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand";
  const isEntrar = tab === "entrar";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center py-10">
      <div className="mb-6 flex justify-center">
        <BrotoLogo />
      </div>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => { setTab("entrar"); setMsg(null); }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${isEntrar ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setTab("criar"); setMsg(null); }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${!isEntrar ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={isEntrar ? entrar : criar} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700">
            E-mail
            <input type="email" className={`mt-1 ${input}`} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>

          {!isEntrar && (
            <label className="text-sm font-medium text-gray-700">
              Nome completo
              <input className={`mt-1 ${input}`} value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          )}

          <label className="text-sm font-medium text-gray-700">
            Senha
            <input type="password" className={`mt-1 ${input}`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isEntrar ? "current-password" : "new-password"} required />
          </label>

          {msg && (
            <p className={`rounded-lg px-3 py-2 text-sm ${msg.t === "err" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {msg.m}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-xl bg-brand py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Aguarde…" : isEntrar ? "Entrar" : "Enviar cadastro"}
          </button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-gray-400">
        Broto PDF — acesso restrito. Novos cadastros passam por aprovação.
      </p>
    </div>
  );
}
