import "server-only";

// Camada de dados dos usuários.
// - Se DATABASE_URL estiver definido → Postgres (produção).
// - Caso contrário → armazenamento EM MEMÓRIA (dev/local; some ao reiniciar).

export type Role = "admin" | "comum";

export type UserRow = {
  id: string;
  username: string;
  name: string;
  password_hash: string;
  role: Role;
  approved: boolean;
  active: boolean;
  must_change: boolean;
  failed_attempts: number;
  locked_until: number | null; // epoch ms
  created_at: number; // epoch ms
};

export type AuditRow = {
  at: number;
  action: string;
  by_name: string | null;
  target_name: string | null;
  detail: string | null;
};

export interface Store {
  init(): Promise<void>;
  findByUsername(username: string): Promise<UserRow | null>;
  findById(id: string): Promise<UserRow | null>;
  insert(row: UserRow): Promise<void>;
  update(id: string, fields: Partial<UserRow>): Promise<void>;
  list(): Promise<UserRow[]>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
  addAudit(row: AuditRow): Promise<void>;
  listAudit(limit: number): Promise<AuditRow[]>;
}

/* ----------------------- Memória (dev) ----------------------- */
class MemStore implements Store {
  private users = new Map<string, UserRow>();
  private audit: AuditRow[] = [];
  async init() {}
  async findByUsername(u: string) {
    for (const r of this.users.values()) if (r.username === u) return { ...r };
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
    this.audit.unshift(row);
  }
  async listAudit(limit: number) {
    return this.audit.slice(0, limit);
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
          username text UNIQUE NOT NULL,
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
      `);
    })();
    return this.ready;
  }

  private map(r: Record<string, unknown>): UserRow {
    return {
      id: r.id as string,
      username: r.username as string,
      name: r.name as string,
      password_hash: r.password_hash as string,
      role: (r.role as Role) === "admin" ? "admin" : "comum",
      approved: !!r.approved,
      active: !!r.active,
      must_change: !!r.must_change,
      failed_attempts: Number(r.failed_attempts ?? 0),
      locked_until: r.locked_until ? new Date(r.locked_until as string).getTime() : null,
      created_at: new Date(r.created_at as string).getTime(),
    };
  }

  async findByUsername(u: string) {
    const pool = await this.getPool();
    const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [u]);
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
      `INSERT INTO users (id,username,name,password_hash,role,approved,active,must_change,failed_attempts,locked_until,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,to_timestamp($11/1000.0))`,
      [r.id, r.username, r.name, r.password_hash, r.role, r.approved, r.active, r.must_change,
       r.failed_attempts, r.locked_until ? new Date(r.locked_until) : null, r.created_at]
    );
  }
  async update(id: string, f: Partial<UserRow>) {
    const cols: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(f)) {
      if (k === "locked_until") {
        cols.push(`locked_until=$${i++}`);
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
  async addAudit(a: AuditRow) {
    const pool = await this.getPool();
    await pool.query(
      "INSERT INTO audit (at,action,by_name,target_name,detail) VALUES (to_timestamp($1/1000.0),$2,$3,$4,$5)",
      [a.at, a.action, a.by_name, a.target_name, a.detail]
    );
  }
  async listAudit(limit: number) {
    const pool = await this.getPool();
    const { rows } = await pool.query("SELECT * FROM audit ORDER BY at DESC LIMIT $1", [limit]);
    return rows.map((r) => ({
      at: new Date(r.at).getTime(),
      action: r.action,
      by_name: r.by_name,
      target_name: r.target_name,
      detail: r.detail,
    }));
  }
}

let store: Store | null = null;
export function getStore(): Store {
  if (!store) store = process.env.DATABASE_URL ? new PgStore() : new MemStore();
  return store;
}
