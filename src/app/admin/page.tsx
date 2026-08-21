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
type SecurityPolicy = {
  maxFailed: number;
  lockMinutes: number;
  rateEnabled: boolean;
  rateWindowSec: number;
  rateMaxLogin: number;
  rateMaxRegister: number;
};

const input = "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";
const LOG_PAGE_SIZES = [10, 20, 50, 100];

export default function AdminPage() {
  const [tab, setTab] = useState<"config" | "security" | "juridico" | "logs" | "activity">("config");
  const [users, setUsers] = useState<Profile[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [activity, setActivity] = useState<Audit[]>([]);
  const [logPage, setLogPage] = useState(0);
  const [logPageSize, setLogPageSize] = useState(20);

  // filtros do log
  const [fText, setFText] = useState("");
  const [fAction, setFAction] = useState("");
  const [fUser, setFUser] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [err, setErr] = useState("");
  const [novo, setNovo] = useState({ email: "", name: "", password: "", role: "comum" });

  // busca e ordenação da lista de usuários (padrão: nome A→Z)
  const [uSearch, setUSearch] = useState("");
  const [uSort, setUSort] = useState<{ key: "name" | "email" | "role" | "situacao"; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });

  // modais
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "comum", active: true, password: "" });
  const [editErr, setEditErr] = useState("");
  const [delTarget, setDelTarget] = useState<Profile | null>(null);

  // política de senha
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [policyMsg, setPolicyMsg] = useState("");

  // política de privacidade (texto editável)
  const [privacy, setPrivacy] = useState<{ version: string; date: string; content: string } | null>(null);
  const [privacyMsg, setPrivacyMsg] = useState("");

  // política de sessão (tempo de inatividade)
  const [sessionPol, setSessionPol] = useState<{ idleMinutes: number } | null>(null);
  const [sessionMsg, setSessionMsg] = useState("");

  // política de segurança (bloqueio de conta + rate limit por IP)
  const [security, setSecurity] = useState<SecurityPolicy | null>(null);
  const [securityMsg, setSecurityMsg] = useState("");

  // política jurídica / assinatura digital (carimbo de tempo)
  const [sign, setSign] = useState<{ tsaUrl: string; timestampDefault: boolean } | null>(null);
  const [signMsg, setSignMsg] = useState("");

  const load = useCallback(async () => {
    const [u, a, p, act, pv, sp, se, sg] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/audit").then((r) => r.json()),
      fetch("/api/admin/policy").then((r) => r.json()),
      fetch("/api/admin/activity").then((r) => r.json()),
      fetch("/api/admin/privacy").then((r) => r.json()),
      fetch("/api/admin/session-policy").then((r) => r.json()),
      fetch("/api/admin/security-policy").then((r) => r.json()),
      fetch("/api/admin/sign-policy").then((r) => r.json()),
    ]);
    setUsers(u.users || []);
    setAudit(a.entries || []);
    setActivity(act.entries || []);
    if (p.policy) setPolicy(p.policy);
    if (pv.privacy) setPrivacy(pv.privacy);
    if (sp.policy) setSessionPol(sp.policy);
    if (se.policy) setSecurity(se.policy);
    if (sg.policy) setSign(sg.policy);
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

  function openEdit(u: Profile) {
    setEditErr("");
    setEditForm({ name: u.name, email: u.email, role: u.role, active: u.active, password: "" });
    setEditTarget(u);
  }

  async function confirmEdit() {
    if (!editTarget) return;
    setEditErr("");
    // Envia só o que mudou; senha vazia = não altera.
    const patch: Record<string, unknown> = {};
    if (editForm.name.trim() !== editTarget.name) patch.name = editForm.name.trim();
    if (editForm.email.trim().toLowerCase() !== editTarget.email) patch.email = editForm.email.trim();
    if (editForm.role !== editTarget.role) patch.role = editForm.role;
    if (editForm.active !== editTarget.active) patch.active = editForm.active;
    if (editForm.password) patch.password = editForm.password;
    if (Object.keys(patch).length === 0) { setEditTarget(null); return; }
    const r = await fetch(`/api/admin/users/${editTarget.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) { setEditErr((await r.json()).error || "Falha ao salvar."); return; }
    setEditTarget(null);
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

  async function saveSession(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionPol) return;
    setSessionMsg("");
    const r = await fetch("/api/admin/session-policy", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sessionPol),
    });
    const d = await r.json();
    if (!r.ok) { setSessionMsg(d.error || "Falha ao salvar."); return; }
    setSessionPol(d.policy);
    setSessionMsg("Tempo de inatividade salvo ✓");
  }

  async function saveSecurity(e: React.FormEvent) {
    e.preventDefault();
    if (!security) return;
    setSecurityMsg("");
    const r = await fetch("/api/admin/security-policy", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(security),
    });
    const d = await r.json();
    if (!r.ok) { setSecurityMsg(d.error || "Falha ao salvar."); return; }
    setSecurity(d.policy);
    setSecurityMsg("Política de segurança salva ✓");
  }

  async function savePrivacy(e: React.FormEvent) {
    e.preventDefault();
    if (!privacy) return;
    setPrivacyMsg("");
    const r = await fetch("/api/admin/privacy", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(privacy),
    });
    const d = await r.json();
    if (!r.ok) { setPrivacyMsg(d.error || "Falha ao salvar."); return; }
    setPrivacy(d.privacy);
    setPrivacyMsg("Política de privacidade salva ✓");
  }

  async function saveSign(e: React.FormEvent) {
    e.preventDefault();
    if (!sign) return;
    setSignMsg("");
    const r = await fetch("/api/admin/sign-policy", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sign),
    });
    const d = await r.json();
    if (!r.ok) { setSignMsg(d.error || "Falha ao salvar."); return; }
    setSign(d.policy);
    setSignMsg("Assinatura digital salva ✓");
  }

  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let s = "";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    for (const n of arr) s += chars[n % chars.length];
    return s;
  };

  const pend = users.filter((u) => !u.approved).length;
  const badge = (txt: string, cls: string) => (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{txt}</span>
  );

  // usuários filtrados pela busca e ordenados (padrão: nome A→Z)
  const situacaoRank = (u: Profile) => (!u.approved ? 0 : u.active ? 1 : 2);
  const visibleUsers = useMemo(() => {
    const q = uSearch.trim().toLowerCase();
    const arr = users.filter(
      (u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
    const dir = uSort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let c = 0;
      if (uSort.key === "name") c = a.name.localeCompare(b.name, "pt-BR");
      else if (uSort.key === "email") c = a.email.localeCompare(b.email, "pt-BR");
      else if (uSort.key === "role") c = a.role.localeCompare(b.role);
      else c = situacaoRank(a) - situacaoRank(b);
      if (c === 0) c = a.name.localeCompare(b.name, "pt-BR"); // desempate por nome
      return c * dir;
    });
    return arr;
  }, [users, uSearch, uSort]);
  const toggleSort = (key: "name" | "email" | "role" | "situacao") =>
    setUSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const sortArrow = (key: string) => (uSort.key === key ? (uSort.dir === "asc" ? " ↑" : " ↓") : "");

  const setP = (k: keyof Policy, v: number | boolean) => setPolicy((p) => (p ? { ...p, [k]: v } : p));
  const setS = (k: keyof SecurityPolicy, v: number | boolean) => setSecurity((s) => (s ? { ...s, [k]: v } : s));

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

  // Exporta os registros filtrados (aba atual) para CSV.
  const exportCsv = () => {
    const cell = (v: unknown) => {
      const s = (v ?? "").toString();
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = tab === "activity"
      ? ["Data", "Hora", "Usuário", "Ferramenta", "Arquivo"]
      : ["Data", "Hora", "Usuário", "Ação", "Alvo", "Detalhe"];
    const lines = [header.join(",")];
    for (const a of filtered) {
      const d = a.at ? new Date(a.at) : null;
      const data = d ? d.toLocaleDateString("pt-BR") : "";
      const hora = d ? d.toLocaleTimeString("pt-BR") : "";
      const cols = tab === "activity"
        ? [data, hora, a.byName || "", a.action || "", a.targetName || ""]
        : [data, hora, a.byName || "", a.action || "", a.targetName || "", a.detail || ""];
      lines.push(cols.map(cell).join(","));
    }
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${tab === "activity" ? "atividade" : "logs"}-broto-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // volta para a 1ª página sempre que o filtro muda
  useEffect(() => { setLogPage(0); }, [fText, fAction, fUser, fFrom, fTo]);
  // ao trocar de aba, limpa filtros e volta à 1ª página
  useEffect(() => { clearFilters(); setLogPage(0); }, [tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / logPageSize));
  const page = Math.min(logPage, totalPages - 1);
  const pageItems = filtered.slice(page * logPageSize, page * logPageSize + logPageSize);

  const tabBtn = (key: "config" | "security" | "juridico" | "logs" | "activity", label: string, count?: number) => (
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
        {tabBtn("security", "Segurança")}
        {tabBtn("juridico", "Jurídico")}
        {tabBtn("logs", "Logs")}
        {tabBtn("activity", "Atividade")}
      </div>

      {tab === "config" && (
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

          {/* busca */}
          <div className="flex items-center gap-3">
            <input
              className={`${input} w-full max-w-sm`}
              placeholder="Buscar por nome ou e-mail…"
              value={uSearch}
              onChange={(e) => setUSearch(e.target.value)}
            />
            <span className="text-xs text-gray-400">
              {uSearch ? `${visibleUsers.length} de ${users.length}` : `${users.length}`} usuário(s)
            </span>
          </div>

          {/* tabela */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="cursor-pointer select-none px-4 py-3 hover:text-gray-600" onClick={() => toggleSort("name")}>Nome{sortArrow("name")}</th>
                  <th className="cursor-pointer select-none px-4 py-3 hover:text-gray-600" onClick={() => toggleSort("email")}>E-mail{sortArrow("email")}</th>
                  <th className="cursor-pointer select-none px-4 py-3 hover:text-gray-600" onClick={() => toggleSort("role")}>Tipo{sortArrow("role")}</th>
                  <th className="cursor-pointer select-none px-4 py-3 hover:text-gray-600" onClick={() => toggleSort("situacao")}>Situação{sortArrow("situacao")}</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-semibold text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
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
                      <div className="flex flex-wrap justify-end gap-2 text-sm font-medium">
                        {!u.approved && (
                          <button onClick={() => act(u.id, "PATCH", { approved: true })} className="inline-flex items-center gap-1 rounded-lg bg-brand-green/15 px-3 py-1.5 text-green-700 transition hover:bg-brand-green/25" title="Aprovar acesso">
                            ✓ Aprovar
                          </button>
                        )}
                        <button onClick={() => openEdit(u)} className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-3 py-1.5 text-brand transition hover:bg-brand/20" title="Editar usuário">
                          ✎ Editar
                        </button>
                        <button onClick={() => setDelTarget(u)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-red-600 transition hover:bg-red-100" title="Excluir usuário">
                          🗑 Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleUsers.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    {users.length === 0 ? "Nenhum usuário ainda." : "Nenhum usuário encontrado para a busca."}
                  </td></tr>
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
      )}

      {tab === "security" && (
        <div className="flex flex-col gap-8">
          {/* bloqueio de conta por senha errada */}
          {security && (
            <form onSubmit={saveSecurity} className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-400">Bloqueio por senha errada</h2>
              <p className="mb-4 text-sm text-gray-500">
                Protege cada conta contra tentativa de adivinhação de senha (brute-force): após várias
                senhas erradas, a conta fica <b>temporariamente bloqueada</b>.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Tentativas antes de bloquear (0 = desliga)</span>
                  <input type="number" min={0} max={50} className={`${input} w-32`} value={security.maxFailed}
                    onChange={(e) => setS("maxFailed", Number(e.target.value))} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Duração do bloqueio (minutos)</span>
                  <input type="number" min={1} max={1440} className={`${input} w-32`} value={security.lockMinutes}
                    onChange={(e) => setS("lockMinutes", Number(e.target.value))} />
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Ex.: <code>5</code> tentativas e <code>15</code> min de bloqueio. O contador zera após um login correto.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">Salvar</button>
                {securityMsg && <span className={`text-sm ${securityMsg.includes("✓") ? "text-green-600" : "text-red-600"}`}>{securityMsg}</span>}
              </div>
            </form>
          )}

          {/* rate limit por IP */}
          {security && (
            <form onSubmit={saveSecurity} className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-400">Limite de tentativas por IP (anti-flood / DDoS)</h2>
              <p className="mb-4 text-sm text-gray-500">
                Limita quantas vezes um mesmo <b>endereço IP</b> pode tentar entrar ou se cadastrar em um curto
                intervalo. Contém ataques automatizados de força bruta e enxurradas de requisições.
              </p>
              <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={security.rateEnabled} onChange={(e) => setS("rateEnabled", e.target.checked)} />
                Ativar limite por IP
              </label>
              <div className={`grid gap-4 sm:grid-cols-3 ${security.rateEnabled ? "" : "opacity-40"}`}>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Janela (segundos)</span>
                  <input type="number" min={5} max={3600} disabled={!security.rateEnabled} className={`${input} w-full`} value={security.rateWindowSec}
                    onChange={(e) => setS("rateWindowSec", Number(e.target.value))} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Máx. logins por IP</span>
                  <input type="number" min={1} max={1000} disabled={!security.rateEnabled} className={`${input} w-full`} value={security.rateMaxLogin}
                    onChange={(e) => setS("rateMaxLogin", Number(e.target.value))} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Máx. cadastros por IP</span>
                  <input type="number" min={1} max={1000} disabled={!security.rateEnabled} className={`${input} w-full`} value={security.rateMaxRegister}
                    onChange={(e) => setS("rateMaxRegister", Number(e.target.value))} />
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Ex.: <code>10</code> logins e <code>5</code> cadastros a cada <code>60</code>s por IP. Ao estourar, o IP recebe
                erro <code>429</code> e precisa aguardar. Bloqueios ficam registrados no log.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">Salvar</button>
                {securityMsg && <span className={`text-sm ${securityMsg.includes("✓") ? "text-green-600" : "text-red-600"}`}>{securityMsg}</span>}
              </div>
            </form>
          )}

          {/* tempo de inatividade da sessão */}
          {sessionPol && (
            <form onSubmit={saveSession} className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-400">Tempo de sessão inativa</h2>
              <p className="mb-4 text-sm text-gray-500">
                Depois de um tempo <b>sem atividade</b>, o usuário é desconectado e volta para a tela de login.
              </p>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Desconectar após inatividade de (minutos)</span>
                <input
                  type="number" min={0} max={1440}
                  className={`${input} w-32`}
                  value={sessionPol.idleMinutes}
                  onChange={(e) => setSessionPol({ idleMinutes: Number(e.target.value) })}
                />
              </label>
              <p className="mt-1 text-xs text-gray-400">
                Ex.: <code>10</code> desconecta após 10 min parado. Use <code>0</code> para <b>desligar</b> (sessão longa, ~12h).
                Vale a partir do próximo login de cada usuário.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">Salvar</button>
                {sessionMsg && <span className={`text-sm ${sessionMsg.includes("✓") ? "text-green-600" : "text-red-600"}`}>{sessionMsg}</span>}
              </div>
            </form>
          )}
        </div>
      )}

      {tab === "juridico" && (
        <div className="flex flex-col gap-8">
          {/* assinatura digital / carimbo de tempo */}
          {sign && (
            <form onSubmit={saveSign} className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-400">Assinatura digital (carimbo de tempo)</h2>
              <p className="mb-4 text-sm text-gray-500">
                Usado pela ferramenta <b>Assinar com certificado</b> (ICP-Brasil A1). O <b>carimbo de tempo</b>{" "}
                comprova a data/hora da assinatura de forma criptográfica.
              </p>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Endereço do servidor de carimbo de tempo (TSA)</span>
                <input
                  className={`${input} w-full`}
                  value={sign.tsaUrl}
                  onChange={(e) => setSign({ ...sign, tsaUrl: e.target.value })}
                  placeholder="http://timestamp.digicert.com"
                />
              </label>
              <p className="mt-1 text-xs text-gray-400">
                Já vem com um TSA <b>gratuito</b> (comprova a hora, mas não é credenciado ICP-Brasil). Quando
                contratar uma <b>ACT credenciada</b> (para carimbo oficial AD-RT), cole aqui o endereço dela.
                Deixe vazio para voltar ao padrão gratuito.
              </p>
              <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={sign.timestampDefault} onChange={(e) => setSign({ ...sign, timestampDefault: e.target.checked })} />
                Já deixar a opção de carimbo de tempo <b>marcada por padrão</b> na ferramenta
              </label>
              <div className="mt-4 flex items-center gap-3">
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">Salvar</button>
                {signMsg && <span className={`text-sm ${signMsg.includes("✓") ? "text-green-600" : "text-red-600"}`}>{signMsg}</span>}
              </div>
            </form>
          )}

          {/* política de privacidade (texto editável) */}
          {privacy && (
            <form onSubmit={savePrivacy} className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-400">Política de privacidade</h2>
              <p className="mb-4 text-sm text-gray-500">
                Este texto aparece no cadastro (ao aceitar) e na página pública <b>/privacidade</b>.
              </p>
              <div className="mb-3 flex flex-wrap gap-3">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Versão</span>
                  <input className={`${input} w-28`} value={privacy.version}
                    onChange={(e) => setPrivacy({ ...privacy, version: e.target.value })} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Data</span>
                  <input className={`${input} w-40`} value={privacy.date}
                    onChange={(e) => setPrivacy({ ...privacy, date: e.target.value })} />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Texto</span>
                <textarea
                  className={`${input} h-72 w-full font-mono text-xs leading-relaxed`}
                  value={privacy.content}
                  onChange={(e) => setPrivacy({ ...privacy, content: e.target.value })}
                />
              </label>
              <p className="mt-1 text-xs text-gray-400">
                Formatação simples: <code>## Título</code> vira subtítulo, <code>- item</code> vira lista,
                e uma linha em branco separa parágrafos.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">Salvar texto</button>
                <a href="/privacidade" target="_blank" className="text-sm text-brand underline hover:opacity-80">Pré-visualizar</a>
                {privacyMsg && <span className={`text-sm ${privacyMsg.includes("✓") ? "text-green-600" : "text-red-600"}`}>{privacyMsg}</span>}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Dica: ao mudar o texto de forma relevante, aumente a <b>versão</b> — cada aceite fica
                registrado no log com a versão vigente.
              </p>
            </form>
          )}
        </div>
      )}

      {(tab === "logs" || tab === "activity") && (
        /* ------------- Abas Logs / Atividade ------------- */
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
              {tab === "activity" ? "Log de atividade dos usuários" : "Log de auditoria"}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {hasFilter ? `${filtered.length} de ${source.length}` : `${source.length}`} registro(s)
              </span>
              <label className="flex items-center gap-1 text-xs text-gray-500">
                Por página
                <select
                  className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-brand"
                  value={logPageSize}
                  onChange={(e) => { setLogPageSize(Number(e.target.value)); setLogPage(0); }}
                >
                  {LOG_PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <button
                onClick={exportCsv}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                title="Baixar os registros filtrados em CSV (abre no Excel)"
              >
                ⤓ Exportar CSV
              </button>
            </div>
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
                    <tr key={page * logPageSize + i} className="border-b border-gray-50 last:border-0">
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
                {page * logPageSize + 1}–{Math.min((page + 1) * logPageSize, filtered.length)} de {filtered.length}
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

      {/* Modal: editar usuário */}
      <Modal open={!!editTarget} title="Editar usuário" onClose={() => setEditTarget(null)}>
        <div className="flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Nome</span>
            <input className={`${input} w-full`} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">E-mail</span>
            <input type="email" className={`${input} w-full`} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Tipo</span>
              <select className={`${input} w-full`} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                <option value="comum">Comum</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Situação</span>
              <select className={`${input} w-full`} value={editForm.active ? "1" : "0"} onChange={(e) => setEditForm({ ...editForm, active: e.target.value === "1" })}>
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </label>
          </div>
          <div className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Nova senha <span className="font-normal text-gray-400">(opcional — deixe em branco para manter)</span></span>
            <div className="flex gap-2">
              <input className={`${input} flex-1`} placeholder="••••••••" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
              <button type="button" onClick={() => setEditForm((f) => ({ ...f, password: genPassword() }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Gerar
              </button>
            </div>
            {editForm.password && <p className="mt-1 text-xs text-gray-400">A pessoa será obrigada a trocá-la no próximo acesso.</p>}
          </div>
        </div>
        {editErr && <p className="mt-2 text-sm text-red-600">{editErr}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setEditTarget(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button onClick={confirmEdit} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            Salvar alterações
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
