"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";

type Profile = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "comum";
  approved: boolean;
  active: boolean;
  mustChange: boolean;
  createdAt: number;
};
type Audit = { action: string; byName?: string; targetName?: string; detail?: string; at?: number };
type Policy = {
  minLength: number;
  requireLower: boolean;
  requireUpper: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  expirationDays: number;
  preventReuse: number;
};

const input = "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";
const LOG_PAGE_SIZE = 20;

export default function AdminPage() {
  const [tab, setTab] = useState<"config" | "logs" | "activity">("config");
  const [users, setUsers] = useState<Profile[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [activity, setActivity] = useState<Audit[]>([]);
  const [logPage, setLogPage] = useState(0);

  // filtros do log
  const [fText, setFText] = useState("");
  const [fAction, setFAction] = useState("");
  const [fUser, setFUser] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [err, setErr] = useState("");
  const [novo, setNovo] = useState({ email: "", name: "", password: "", role: "comum" });

  // modais
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [delTarget, setDelTarget] = useState<Profile | null>(null);

  // política de senha
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [policyMsg, setPolicyMsg] = useState("");

  const load = useCallback(async () => {
    const [u, a, p, act] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/audit").then((r) => r.json()),
      fetch("/api/admin/policy").then((r) => r.json()),
      fetch("/api/admin/activity").then((r) => r.json()),
    ]);
    setUsers(u.users || []);
    setAudit(a.entries || []);
    setActivity(act.entries || []);
    if (p.policy) setPolicy(p.policy);
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
    setNovo({ email: "", name: "", password: "", role: "comum" });
    await load();
  }

  async function confirmReset() {
    if (!resetTarget) return;
    setResetErr("");
    const r = await fetch(`/api/admin/users/${resetTarget.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: resetPw }),
    });
    if (!r.ok) { setResetErr((await r.json()).error || "Falha ao redefinir."); return; }
    setResetTarget(null); setResetPw("");
    await load();
  }

  async function confirmDelete() {
    if (!delTarget) return;
    await act(delTarget.id, "DELETE");
    setDelTarget(null);
  }

  async function savePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!policy) return;
    setPolicyMsg("");
    const r = await fetch("/api/admin/policy", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(policy),
    });
    const d = await r.json();
    if (!r.ok) { setPolicyMsg(d.error || "Falha ao salvar."); return; }
    setPolicy(d.policy);
    setPolicyMsg("Política salva ✓");
  }

  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let s = "";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    for (const n of arr) s += chars[n % chars.length];
    setResetPw(s);
  };

  const pend = users.filter((u) => !u.approved).length;
  const badge = (txt: string, cls: string) => (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{txt}</span>
  );
  const setP = (k: keyof Policy, v: number | boolean) => setPolicy((p) => (p ? { ...p, [k]: v } : p));

  // fonte do log conforme a aba (system x atividade)
  const source = tab === "activity" ? activity : audit;

  // opções derivadas para os selects de filtro
  const actionOpts = useMemo(
    () => Array.from(new Set(source.map((a) => a.action).filter(Boolean))).sort() as string[],
    [source]
  );
  const userOpts = useMemo(
    () => Array.from(new Set(source.map((a) => a.byName).filter(Boolean))).sort() as string[],
    [source]
  );

  const filtered = useMemo(() => {
    const q = fText.trim().toLowerCase();
    const from = fFrom ? new Date(`${fFrom}T00:00:00`).getTime() : null;
    const to = fTo ? new Date(`${fTo}T23:59:59.999`).getTime() : null;
    return source.filter((a) => {
      if (fAction && a.action !== fAction) return false;
      if (fUser && a.byName !== fUser) return false;
      if (from !== null || to !== null) {
        if (!a.at) return false;
        if (from !== null && a.at < from) return false;
        if (to !== null && a.at > to) return false;
      }
      if (q) {
        const hay = `${a.byName || ""} ${a.action || ""} ${a.targetName || ""} ${a.detail || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [source, fText, fAction, fUser, fFrom, fTo]);

  const hasFilter = !!(fText || fAction || fUser || fFrom || fTo);
  const clearFilters = () => { setFText(""); setFAction(""); setFUser(""); setFFrom(""); setFTo(""); };

  // volta para a 1ª página sempre que o filtro muda
  useEffect(() => { setLogPage(0); }, [fText, fAction, fUser, fFrom, fTo]);
  // ao trocar de aba, limpa filtros e volta à 1ª página
  useEffect(() => { clearFilters(); setLogPage(0); }, [tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOG_PAGE_SIZE));
  const page = Math.min(logPage, totalPages - 1);
  const pageItems = filtered.slice(page * LOG_PAGE_SIZE, page * LOG_PAGE_SIZE + LOG_PAGE_SIZE);

  const tabBtn = (key: "config" | "logs" | "activity", label: string, count?: number) => (
    <button
      onClick={() => setTab(key)}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
    >
      {label}
      {count ? <span className="ml-2 rounded-md bg-brand-yellow px-1.5 py-0.5 text-xs text-brand-ink">{count}</span> : null}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie usuários, a política de senha e veja o histórico.</p>
      </div>

      {/* Abas */}
      <div className="inline-flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
        {tabBtn("config", "Configurações", pend)}
        {tabBtn("logs", "Logs")}
        {tabBtn("activity", "Atividade")}
      </div>

      {tab === "config" ? (
        <div className="flex flex-col gap-8">
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

          {/* novo usuário */}
          <form onSubmit={criar} className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-semibold text-gray-500">E-mail</label>
              <input type="email" className={input} value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} required />
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
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.email}</td>
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
                        <button onClick={() => { setResetTarget(u); setResetPw(""); setResetErr(""); }} className="rounded-md bg-gray-100 px-2.5 py-1 text-gray-700 hover:bg-gray-200">
                          Redefinir senha
                        </button>
                        <button onClick={() => setDelTarget(u)} className="rounded-md bg-red-50 px-2.5 py-1 text-red-600 hover:bg-red-100">
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

          {/* política de senha */}
          {policy && (
            <form onSubmit={savePolicy} className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-400">Política de senha</h2>
              <p className="mb-4 text-sm text-gray-500">Regras aplicadas ao criar/alterar senhas.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Mínimo de caracteres</span>
                  <input type="number" min={4} max={64} className={`${input} w-28`} value={policy.minLength}
                    onChange={(e) => setP("minLength", Number(e.target.value))} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Expiração (dias, 0 = nunca)</span>
                  <input type="number" min={0} max={3650} className={`${input} w-28`} value={policy.expirationDays}
                    onChange={(e) => setP("expirationDays", Number(e.target.value))} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Não repetir as últimas N senhas (0 = desliga)</span>
                  <input type="number" min={0} max={24} className={`${input} w-28`} value={policy.preventReuse}
                    onChange={(e) => setP("preventReuse", Number(e.target.value))} />
                </label>
                <div className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Exigir</span>
                  <div className="flex flex-col gap-1.5 text-gray-600">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={policy.requireLower} onChange={(e) => setP("requireLower", e.target.checked)} /> letra minúscula</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={policy.requireUpper} onChange={(e) => setP("requireUpper", e.target.checked)} /> letra maiúscula</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={policy.requireNumber} onChange={(e) => setP("requireNumber", e.target.checked)} /> número</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={policy.requireSymbol} onChange={(e) => setP("requireSymbol", e.target.checked)} /> símbolo (ex.: !@#$)</label>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">Salvar política</button>
                {policyMsg && <span className={`text-sm ${policyMsg.includes("✓") ? "text-green-600" : "text-red-600"}`}>{policyMsg}</span>}
              </div>
            </form>
          )}
        </div>
      ) : (
        /* ------------- Abas Logs / Atividade ------------- */
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
              {tab === "activity" ? "Log de atividade dos usuários" : "Log de auditoria"}
            </h2>
            <span className="text-xs text-gray-400">
              {hasFilter ? `${filtered.length} de ${source.length}` : `${source.length}`} registro(s)
            </span>
          </div>

          {/* filtros */}
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-3">
            <div className="flex min-w-[180px] flex-1 flex-col">
              <label className="mb-1 text-xs font-semibold text-gray-500">Buscar</label>
              <input
                className={input}
                placeholder={tab === "activity" ? "Usuário, ferramenta ou arquivo…" : "Usuário, ação, alvo ou detalhe…"}
                value={fText}
                onChange={(e) => setFText(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-semibold text-gray-500">{tab === "activity" ? "Ferramenta" : "Ação"}</label>
              <select className={input} value={fAction} onChange={(e) => setFAction(e.target.value)}>
                <option value="">Todas</option>
                {actionOpts.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-semibold text-gray-500">Usuário</label>
              <select className={input} value={fUser} onChange={(e) => setFUser(e.target.value)}>
                <option value="">Todos</option>
                {userOpts.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-semibold text-gray-500">De</label>
              <input type="date" className={input} value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-semibold text-gray-500">Até</label>
              <input type="date" className={input} value={fTo} onChange={(e) => setFTo(e.target.value)} />
            </div>
            {hasFilter && (
              <button
                onClick={clearFilters}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5">Hora</th>
                  <th className="px-3 py-2.5">Usuário</th>
                  {tab === "activity" ? (
                    <>
                      <th className="px-3 py-2.5">Ferramenta</th>
                      <th className="px-3 py-2.5">Arquivo</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2.5">Ação</th>
                      <th className="px-3 py-2.5">Alvo</th>
                      <th className="px-3 py-2.5">Detalhe</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a, i) => {
                  const d = a.at ? new Date(a.at) : null;
                  return (
                    <tr key={page * LOG_PAGE_SIZE + i} className="border-b border-gray-50 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">{d ? d.toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">{d ? d.toLocaleTimeString("pt-BR") : "—"}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{a.byName || "—"}</td>
                      {tab === "activity" ? (
                        <>
                          <td className="px-3 py-2.5 text-gray-600">{a.action}</td>
                          <td className="px-3 py-2.5 font-medium text-brand break-all">{a.targetName || "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-gray-600">{a.action}</td>
                          <td className="px-3 py-2.5 font-medium text-brand">{a.targetName || "—"}</td>
                          <td className="px-3 py-2.5 text-gray-400">{a.detail || "—"}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={tab === "activity" ? 5 : 6} className="px-3 py-8 text-center text-gray-400">
                      {source.length === 0 ? "Sem registros ainda." : "Nenhum registro para os filtros aplicados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
              <span className="text-gray-500">
                {page * LOG_PAGE_SIZE + 1}–{Math.min((page + 1) * LOG_PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <span className="text-gray-500">Página {page + 1} de {totalPages}</span>
                <button
                  onClick={() => setLogPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: redefinir senha */}
      <Modal open={!!resetTarget} title="Redefinir senha" onClose={() => setResetTarget(null)}>
        <p className="mb-4 text-sm text-gray-600">
          Definir uma nova senha para <b className="text-gray-800">{resetTarget?.email}</b>. A pessoa será
          obrigada a trocá-la no próximo acesso.
        </p>
        <div className="flex gap-2">
          <input
            className={`${input} flex-1`} placeholder="Nova senha provisória"
            value={resetPw} onChange={(e) => setResetPw(e.target.value)}
          />
          <button type="button" onClick={genPassword} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Gerar
          </button>
        </div>
        {resetErr && <p className="mt-2 text-sm text-red-600">{resetErr}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setResetTarget(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button onClick={confirmReset} disabled={!resetPw} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
            Redefinir
          </button>
        </div>
      </Modal>

      {/* Modal: excluir */}
      <Modal open={!!delTarget} title="Excluir usuário" onClose={() => setDelTarget(null)}>
        <p className="text-sm text-gray-600">
          Tem certeza que deseja excluir <b className="text-gray-800">{delTarget?.email}</b>? Esta ação não pode ser desfeita.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setDelTarget(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button onClick={confirmDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
