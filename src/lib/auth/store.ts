import "server-only";

// Camada de dados dos usuários.
// - Se DATABASE_URL estiver definido → Postgres (produção).
// - Caso contrário → armazenamento EM MEMÓRIA (dev/local; some ao reiniciar).

export type Role = "admin" | "comum";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  approved: boolean;
  active: boolean;
  must_change: boolean;
  failed_attempts: number;
  locked_until: number | null; // epoch ms
  created_at: number; // epoch ms
  pwd_changed_at: number; // epoch ms
  pwd_history: string[]; // hashes anteriores (mais recente primeiro)
};

export type AuditRow = {
  at: number;
  action: string;
  by_name: string | null;
  target_name: string | null;
  detail: string | null;
  // "system" = login/gestão de usuários; "activity" = uso das ferramentas.
  category?: string;
};

export interface Store {
  init(): Promise<void>;
  findByEmail(email: string): Promise<UserRow | null>;
  findById(id: string): Promise<UserRow | null>;
  insert(row: UserRow): Promise<void>;
  update(id: string, fields: Partial<UserRow>): Promise<void>;
  list(): Promise<UserRow[]>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
  addAudit(row: AuditRow): Promise<void>;
  listAudit(limit: number, category?: string): Promise<AuditRow[]>;
  getSetting<T>(key: string): Promise<T | null>;
  setSetting<T>(key: string, value: T): Promise<void>;
  /** Rate limit persistente: consome 1 tentativa para `bucket`. */
  rateConsume(bucket: string, windowSec: number, max: number): Promise<{ ok: boolean; retryAfterSec: number }>;
}

// Retenção de logs de auditoria (dias). Registros mais antigos são apagados.
const AUDIT_RETENTION_DAYS = 180;
const MEM_AUDIT_CAP = 5000;

/* ----------------------- Memória (dev) ----------------------- */
class MemStore implements Store {
  private users = new Map<string, UserRow>();
  private audit: AuditRow[] = [];
  private settings = new Map<string, unknown>();
  private rate = new Map<string, number[]>();
  async init() {}
  async findByEmail(email: string) {
    for (const r of this.users.values()) if (r.email === email) return { ...r };
    return null;
  }
  async findById(id: string) {
    const r = this.users.get(id);
    return r ? { ...r } : null;
  }
  async insert(row: UserRow) {
    this.users.set(row.id, { ...row });
  }
  async update(id: string, fields: Partial<UserRow>) {
    const r = this.users.get(id);
    if (r) this.users.set(id, { ...r, ...fields });
  }
  async list() {
    return [...this.users.values()].sort((a, b) => b.created_at - a.created_at).map((r) => ({ ...r }));
  }
  async remove(id: string) {
    this.users.delete(id);
  }
  async count() {
    return this.users.size;
  }
  async addAudit(row: AuditRow) {
    this.audit.unshift({ category: "system", ...row });
    if (this.audit.length > MEM_AUDIT_CAP) this.audit.length = MEM_AUDIT_CAP;
  }
  async listAudit(limit: number, category?: string) {
    const src = category ? this.audit.filter((r) => (r.category ?? "system") === category) : this.audit;
    return src.slice(0, limit);
  }
  async getSetting<T>(key: string) {
    return (this.settings.get(key) as T) ?? null;
  }
  async setSetting<T>(key: string, value: T) {
    this.settings.set(key, value);
  }
  async rateConsume(bucket: string, windowSec: number, max: number) {
    const now = Date.now();
    const cutoff = now - windowSec * 1000;
    const arr = (this.rate.get(bucket) || []).filter((t) => t > cutoff);
    if (arr.length >= max) {
      this.rate.set(bucket, arr);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((arr[0] + windowSec * 1000 - now) / 1000)) };
    }
    arr.push(now);
    this.rate.set(bucket, arr);
    return { ok: true, retryAfterSec: 0 };
  }
}

/* ----------------------- Postgres (prod) ----------------------- */
class PgStore implements Store {
  private pool: import("pg").Pool | null = null;
  private ready: Promise<void> | null = null;

  private async getPool() {
    if (this.pool) return this.pool;
    const { Pool } = await import("pg");
    const url = process.env.DATABASE_URL!;
    const local = /localhost|127\.0\.0\.1/.test(url);
    const ssl = process.env.PGSSL === "off" || local ? false : { rejectUnauthorized: false };
    this.pool = new Pool({ connectionString: url, ssl });
    return this.pool;
  }

  async init() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const pool = await this.getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id text PRIMARY KEY,
          email text UNIQUE NOT NULL,
          name text NOT NULL,
          password_hash text NOT NULL,
          role text NOT NULL DEFAULT 'comum',
          approved boolean NOT NULL DEFAULT false,
          active boolean NOT NULL DEFAULT true,
          must_change boolean NOT NULL DEFAULT false,
          failed_attempts integer NOT NULL DEFAULT 0,
          locked_until timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS audit (
          id bigserial PRIMARY KEY,
          at timestamptz NOT NULL DEFAULT now(),
          action text NOT NULL,
          by_name text,
          target_name text,
          detail text
        );
        CREATE TABLE IF NOT EXISTS settings (
          key text PRIMARY KEY,
          value jsonb NOT NULL
        );
        -- Migrações incrementais (idempotentes).
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email')
          THEN ALTER TABLE users RENAME COLUMN username TO email; END IF;
        END $$;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS pwd_changed_at timestamptz NOT NULL DEFAULT now();
        ALTER TABLE users ADD COLUMN IF NOT EXISTS pwd_history text[] NOT NULL DEFAULT '{}';
        ALTER TABLE audit ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'system';
        CREATE INDEX IF NOT EXISTS audit_category_at_idx ON audit (category, at DESC);
        CREATE TABLE IF NOT EXISTS rate_hits (
          bucket text NOT NULL,
          at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS rate_hits_bucket_at_idx ON rate_hits (bucket, at DESC);
      `);
      // Limpeza de logs antigos e de rate-hits vencidos (na subida).
      await pool.query(`DELETE FROM audit WHERE at < now() - make_interval(days => $1)`, [AUDIT_RETENTION_DAYS]).catch(() => {});
      await pool.query(`DELETE FROM rate_hits WHERE at < now() - interval '1 hour'`).catch(() => {});
    })();
    return this.ready;
  }

  private map(r: Record<string, unknown>): UserRow {
    return {
      id: r.id as string,
      email: r.email as string,
      name: r.name as string,
      password_hash: r.password_hash as string,
      role: (r.role as Role) === "admin" ? "admin" : "comum",
      approved: !!r.approved,
      active: !!r.active,
      must_change: !!r.must_change,
      failed_attempts: Number(r.failed_attempts ?? 0),
      locked_until: r.locked_until ? new Date(r.locked_until as string).getTime() : null,
      created_at: new Date(r.created_at as string).getTime(),
      pwd_changed_at: r.pwd_changed_at ? new Date(r.pwd_changed_at as string).getTime() : Date.now(),
      pwd_history: (r.pwd_history as string[]) ?? [],
    };
  }

  async findByEmail(email: string) {
    const pool = await this.getPool();
    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    return rows[0] ? this.map(rows[0]) : null;
  }
  async findById(id: string) {
    const pool = await this.getPool();
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
    return rows[0] ? this.map(rows[0]) : null;
  }
  async insert(r: UserRow) {
    const pool = await this.getPool();
    await pool.query(
      `INSERT INTO users (id,email,name,password_hash,role,approved,active,must_change,failed_attempts,locked_until,created_at,pwd_changed_at,pwd_history)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,to_timestamp($11/1000.0),to_timestamp($12/1000.0),$13)`,
      [r.id, r.email, r.name, r.password_hash, r.role, r.approved, r.active, r.must_change,
       r.failed_attempts, r.locked_until ? new Date(r.locked_until) : null, r.created_at, r.pwd_changed_at, r.pwd_history]
    );
  }
  async update(id: string, f: Partial<UserRow>) {
    const cols: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(f)) {
      if (k === "locked_until" || k === "pwd_changed_at") {
        cols.push(`${k}=$${i++}`);
        vals.push(v ? new Date(v as number) : null);
      } else {
        cols.push(`${k}=$${i++}`);
        vals.push(v);
      }
    }
    if (!cols.length) return;
    vals.push(id);
    const pool = await this.getPool();
    await pool.query(`UPDATE users SET ${cols.join(",")} WHERE id=$${i}`, vals);
  }
  async list() {
    const pool = await this.getPool();
    const { rows } = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
    return rows.map((r) => this.map(r));
  }
  async remove(id: string) {
    const pool = await this.getPool();
    await pool.query("DELETE FROM users WHERE id=$1", [id]);
  }
  async count() {
    const pool = await this.getPool();
    const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM users");
    return rows[0].c as number;
  }
  private auditWrites = 0;
  async addAudit(a: AuditRow) {
    const pool = await this.getPool();
    await pool.query(
      "INSERT INTO audit (at,action,by_name,target_name,detail,category) VALUES (to_timestamp($1/1000.0),$2,$3,$4,$5,$6)",
      [a.at, a.action, a.by_name, a.target_name, a.detail, a.category ?? "system"]
    );
    // A cada ~200 inserções, poda registros além da retenção (não bloqueia).
    if (++this.auditWrites % 200 === 0) {
      pool.query(`DELETE FROM audit WHERE at < now() - make_interval(days => $1)`, [AUDIT_RETENTION_DAYS]).catch(() => {});
    }
  }
  async listAudit(limit: number, category?: string) {
    const pool = await this.getPool();
    const { rows } = category
      ? await pool.query("SELECT * FROM audit WHERE category=$1 ORDER BY at DESC LIMIT $2", [category, limit])
      : await pool.query("SELECT * FROM audit ORDER BY at DESC LIMIT $1", [limit]);
    return rows.map((r) => ({
      at: new Date(r.at).getTime(),
      action: r.action,
      by_name: r.by_name,
      target_name: r.target_name,
      detail: r.detail,
      category: r.category ?? "system",
    }));
  }
  async getSetting<T>(key: string) {
    const pool = await this.getPool();
    const { rows } = await pool.query("SELECT value FROM settings WHERE key=$1", [key]);
    return rows[0] ? (rows[0].value as T) : null;
  }
  async setSetting<T>(key: string, value: T) {
    const pool = await this.getPool();
    await pool.query(
      "INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2",
      [key, JSON.stringify(value)]
    );
  }
  async rateConsume(bucket: string, windowSec: number, max: number) {
    const pool = await this.getPool();
    // Janela deslizante persistente: poda o bucket, conta, e só registra a
    // tentativa se ainda estiver dentro do limite.
    await pool.query(`DELETE FROM rate_hits WHERE bucket=$1 AND at < now() - make_interval(secs => $2)`, [bucket, windowSec]);
    const { rows } = await pool.query(
      `SELECT count(*)::int AS c, EXTRACT(EPOCH FROM (min(at) + make_interval(secs => $2) - now()))::int AS retry FROM rate_hits WHERE bucket=$1`,
      [bucket, windowSec]
    );
    const c = rows[0]?.c ?? 0;
    if (c >= max) {
      return { ok: false, retryAfterSec: Math.max(1, Number(rows[0]?.retry) || windowSec) };
    }
    await pool.query("INSERT INTO rate_hits (bucket) VALUES ($1)", [bucket]);
    return { ok: true, retryAfterSec: 0 };
  }
}

let store: Store | null = null;
export function getStore(): Store {
  if (!store) store = process.env.DATABASE_URL ? new PgStore() : new MemStore();
  return store;
}
