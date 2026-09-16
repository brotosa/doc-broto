import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { listAudit } from "@/lib/auth/users";
import { getTool } from "@/lib/tools";

export const runtime = "nodejs";

const SAMPLE = 5000; // teto de registros lidos para agregar
const DAYS = 14;

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export async function GET() {
  const u = await getSessionUser();
  if (!u || u.role !== "admin") return NextResponse.json({ error: "acesso restrito" }, { status: 403 });

  const rows = await listAudit(SAMPLE, "activity");
  const now = Date.now();
  const cutoff7 = now - 7 * 864e5;

  const byTool = new Map<string, number>();
  const byUser = new Map<string, number>();
  const byDay = new Map<string, number>();
  let last7 = 0;

  // Esqueleto dos últimos DIAS (para dias sem uso aparecerem como 0).
  for (let i = DAYS - 1; i >= 0; i--) byDay.set(dayKey(now - i * 864e5), 0);

  for (const r of rows) {
    const at = r.at ?? 0;
    const toolSlug = r.detail || "";
    const tool = getTool(toolSlug);
    const label = tool?.title || toolSlug || "—";
    byTool.set(label, (byTool.get(label) || 0) + 1);
    if (r.byName) byUser.set(r.byName, (byUser.get(r.byName) || 0) + 1);
    const dk = dayKey(at);
    if (byDay.has(dk)) byDay.set(dk, (byDay.get(dk) || 0) + 1);
    if (at >= cutoff7) last7++;
  }

  const topTools = [...byTool.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
  const topUsers = [...byUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
  const perDay = [...byDay.entries()].map(([day, count]) => ({ day, count }));

  return NextResponse.json({
    total: rows.length,
    last7,
    activeUsers: byUser.size,
    sampled: rows.length >= SAMPLE,
    topTools,
    topUsers,
    perDay,
  });
}
