"use client";

import { useCallback, useEffect, useState } from "react";

type Profile = {
  id: string;
  username: string;
  name: string;
  role: "admin" | "comum";
  approved: boolean;
  active: boolean;
  mustChange: boolean;
  createdAt: number;
};
type Audit = { action: string; byName?: string; targetName?: string; detail?: string; at?: number };

export default function AdminPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [err, setErr] = useState("");
  const [novo, setNovo] = useState({ username: "", name: "", password: "", role: "comum" });

  const load = useCallback(async () => {
    const [u, a] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/audit").then((r) => r.json()),
    ]);
    setUsers(u.users || []);
    setAudit(a.entries || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, method: "PATCH" | "DELETE", body?: unknown) {
    setErr("");
    const r = await fetch(`/api/admin/users/${id}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) setErr((await r.json()).error || "Falha na operação.");
    await load();
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(novo),
    });
    if (!r.ok) { setErr((await r.json()).error || "Falha ao criar usuário."); return; }
    setNovo({ username: "", name: "", password: "", role: "comum" });
    await load();
  }

  const pend = users.filter((u) => !u.approved).length;
  const badge = (txt: string, cls: string) => (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{txt}</span>
  );
  const input = "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações — usuários</h1>
        <p className="mt-1 text-sm text-gray-500">
          {pend > 0 ? `${pend} cadastro(s) aguardando aprovação.` : "Nenhum cadastro pendente."}
        </p>
      </div>

      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {/* novo usuário */}
      <form onSubmit={criar} className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-semibold text-gray-500">Usuário</label>
          <input className={input} value={novo.username} onChange={(e) => setNovo({ ...novo, username: e.target.value })} required />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-semibold text-gray-500">Nome</label>
          <input className={input} value={novo.name} onChange={(e) => setNovo({ ...novo, name: e.target.value })} required />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-semibold text-gray-500">Senha provisória</label>
          <input className={input} value={novo.password} onChange={(e) => setNovo({ ...novo, password: e.target.value })} required />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-semibold text-gray-500">Tipo</label>
          <select className={input} value={novo.role} onChange={(e) => setNovo({ ...novo, role: e.target.value })}>
            <option value="comum">Comum</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
          + Criar usuário
        </button>
      </form>

      {/* tabela */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
                <td className="px-4 py-3 text-gray-600">{u.name}</td>
                <td className="px-4 py-3">
                  {u.role === "admin" ? badge("Admin", "bg-brand/10 text-brand") : badge("Comum", "bg-gray-100 text-gray-600")}
                </td>
                <td className="px-4 py-3">
                  {!u.approved
                    ? badge("Pendente", "bg-brand-yellow text-brand-ink")
                    : u.active
                      ? badge("Ativo", "bg-green-50 text-green-700")
                      : badge("Inativo", "bg-gray-100 text-gray-500")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5 text-xs font-medium">
                    {!u.approved && (
                      <button onClick={() => act(u.id, "PATCH", { approved: true })} className="rounded-md bg-brand-green/15 px-2.5 py-1 text-green-700 hover:bg-brand-green/25">Aprovar</button>
                    )}
                    <button onClick={() => act(u.id, "PATCH", { active: !u.active })} className="rounded-md bg-gray-100 px-2.5 py-1 text-gray-700 hover:bg-gray-200">
                      {u.active ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => act(u.id, "PATCH", { role: u.role === "admin" ? "comum" : "admin" })} className="rounded-md bg-gray-100 px-2.5 py-1 text-gray-700 hover:bg-gray-200">
                      {u.role === "admin" ? "→ Comum" : "→ Admin"}
                    </button>
                    <button
                      onClick={() => {
                        const s = prompt(`Nova senha para ${u.username} (mín. 6):`);
                        if (s) act(u.id, "PATCH", { password: s });
                      }}
                      className="rounded-md bg-gray-100 px-2.5 py-1 text-gray-700 hover:bg-gray-200"
                    >
                      Redefinir senha
                    </button>
                    <button
                      onClick={() => { if (confirm(`Excluir ${u.username}?`)) act(u.id, "DELETE"); }}
                      className="rounded-md bg-red-50 px-2.5 py-1 text-red-600 hover:bg-red-100"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum usuário ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* auditoria */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Log de auditoria</h2>
        <div className="flex flex-col gap-1.5">
          {audit.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-600">
              <span className="text-gray-400">{a.at ? new Date(a.at).toLocaleString("pt-BR") : ""}</span>
              <span className="font-semibold text-gray-800">{a.byName || "—"}</span>
              <span>{a.action}</span>
              {a.targetName && <span className="font-medium text-brand">{a.targetName}</span>}
              {a.detail && <span className="text-gray-400">({a.detail})</span>}
            </div>
          ))}
          {audit.length === 0 && <p className="text-sm text-gray-400">Sem registros ainda.</p>}
        </div>
      </div>
    </div>
  );
}
