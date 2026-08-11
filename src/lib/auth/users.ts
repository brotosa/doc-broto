import "server-only";

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getStore, type Role, type UserRow } from "./store";

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  approved: boolean;
  active: boolean;
  mustChange: boolean;
  createdAt: number;
};

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function norm(email: string): string {
  return email.trim().toLowerCase();
}
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(norm(email));
}
function toProfile(r: UserRow): Profile {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    approved: r.approved,
    active: r.active,
    mustChange: r.must_change,
    createdAt: r.created_at,
  };
}

async function init() {
  await getStore().init();
}

/* -------- Autenticação (com bloqueio anti-força-bruta) -------- */
export async function authenticate(email: string, password: string): Promise<Profile> {
  await init();
  const store = getStore();
  const user = await store.findByEmail(norm(email));

  if (!user) {
    // Compara com um hash falso pra igualar o tempo de resposta.
    await bcrypt.compare(password, "$2a$10$0000000000000000000000000000000000000000000000000000");
    throw new Error("E-mail ou senha inválidos.");
  }

  const now = Date.now();
  if (user.locked_until && user.locked_until > now) {
    const min = Math.ceil((user.locked_until - now) / 60000);
    throw new Error(`Muitas tentativas. Tente novamente em ${min} min.`);
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const failed = user.failed_attempts + 1;
    const patch: Partial<UserRow> = { failed_attempts: failed };
    if (failed >= MAX_FAILED) {
      patch.failed_attempts = 0;
      patch.locked_until = now + LOCK_MS;
    }
    await store.update(user.id, patch);
    throw new Error("E-mail ou senha inválidos.");
  }

  if (user.failed_attempts || user.locked_until) {
    await store.update(user.id, { failed_attempts: 0, locked_until: null });
  }
  if (!user.approved) throw new Error("Conta aguardando liberação do administrador.");
  if (!user.active) throw new Error("Conta desativada. Fale com o administrador.");
  return toProfile(user);
}

/* -------- Criação de contas -------- */
type CreateInput = {
  email: string;
  name: string;
  password: string;
  role?: Role;
  approved?: boolean;
  mustChange?: boolean;
};
export async function createAccount(input: CreateInput): Promise<Profile> {
  await init();
  const store = getStore();
  const email = norm(input.email);
  const name = input.name?.trim();
  if (!email || !name || !input.password) throw new Error("Preencha e-mail, nome e senha.");
  if (!isValidEmail(email)) throw new Error("Informe um e-mail válido.");
  if (input.password.length < 6) throw new Error("A senha deve ter ao menos 6 caracteres.");
  if (await store.findByEmail(email)) throw new Error("Este e-mail já está cadastrado.");

  const row: UserRow = {
    id: randomUUID(),
    email,
    name,
    password_hash: await bcrypt.hash(input.password, 10),
    role: input.role ?? "comum",
    approved: input.approved ?? false,
    active: true,
    must_change: input.mustChange ?? false,
    failed_attempts: 0,
    locked_until: null,
    created_at: Date.now(),
  };
  await store.insert(row);
  return toProfile(row);
}

export async function getProfile(id: string): Promise<Profile | null> {
  await init();
  const r = await getStore().findById(id);
  return r ? toProfile(r) : null;
}

export async function listProfiles(): Promise<Profile[]> {
  await init();
  return (await getStore().list()).map(toProfile);
}

type Patch = { name?: string; role?: Role; approved?: boolean; active?: boolean; password?: string };
export async function updateUser(id: string, patch: Patch): Promise<void> {
  await init();
  const fields: Partial<UserRow> = {};
  if (typeof patch.name === "string") fields.name = patch.name.trim();
  if (patch.role) fields.role = patch.role;
  if (typeof patch.approved === "boolean") fields.approved = patch.approved;
  if (typeof patch.active === "boolean") fields.active = patch.active;
  if (patch.password) {
    if (patch.password.length < 6) throw new Error("A senha deve ter ao menos 6 caracteres.");
    fields.password_hash = await bcrypt.hash(patch.password, 10);
    fields.must_change = true; // admin redefiniu → troca no próximo acesso
  }
  await getStore().update(id, fields);
}

// Troca de senha pelo próprio usuário (limpa a obrigatoriedade).
export async function selfChangePassword(id: string, newPassword: string): Promise<void> {
  await init();
  if (!newPassword || newPassword.length < 6) throw new Error("A senha deve ter ao menos 6 caracteres.");
  await getStore().update(id, {
    password_hash: await bcrypt.hash(newPassword, 10),
    must_change: false,
    failed_attempts: 0,
    locked_until: null,
  });
}

export async function deleteUser(id: string): Promise<void> {
  await init();
  await getStore().remove(id);
}

// Cria o primeiro admin a partir das variáveis de ambiente (idempotente).
// ADMIN_EMAIL é o e-mail de login; ADMIN_USERNAME é aceito por compatibilidade.
export async function ensureAdminSeed(): Promise<void> {
  await init();
  const email = norm(process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || "");
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Administrador";
  if (!email || !password) return;
  const store = getStore();
  if (await store.findByEmail(email)) return;

  // Converte um admin legado (seed antigo por "usuário") para o novo e-mail.
  const legacy = norm(process.env.ADMIN_USERNAME || "");
  if (legacy && legacy !== email) {
    const old = await store.findByEmail(legacy);
    if (old && old.role === "admin") {
      await store.update(old.id, { email });
      return;
    }
  }

  if (!isValidEmail(email)) return; // evita semear um admin com "usuário" inválido
  await createAccount({ email, name, password, role: "admin", approved: true, mustChange: false });
}

/* -------- Auditoria -------- */
export type AuditEntry = { action: string; byName?: string; targetName?: string; detail?: string; at?: number };
export async function audit(e: AuditEntry): Promise<void> {
  try {
    await init();
    await getStore().addAudit({
      at: Date.now(),
      action: e.action,
      by_name: e.byName ?? null,
      target_name: e.targetName ?? null,
      detail: e.detail ?? null,
    });
  } catch {
    /* auditoria nunca deve quebrar a ação principal */
  }
}
export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  await init();
  return (await getStore().listAudit(limit)).map((r) => ({
    action: r.action,
    byName: r.by_name ?? undefined,
    targetName: r.target_name ?? undefined,
    detail: r.detail ?? undefined,
    at: r.at,
  }));
}
