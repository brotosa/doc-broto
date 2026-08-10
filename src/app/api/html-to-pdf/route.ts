import { NextResponse } from "next/server";
import { fileResponse, errorResponse } from "@/lib/server/http";
import { htmlToPdf } from "@/lib/server/browser";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const html = typeof body.html === "string" ? body.html : "";
    if (!url && !html) throw new ProcessingError("Informe uma URL ou HTML.");
    const pdf = await htmlToPdf({ url: url || undefined, html: html || undefined });
    return fileResponse(pdf, "pagina.pdf");
  } catch (err) {
    return errorResponse(err);
  }
}

export function GET() {
  return NextResponse.json({ ok: true });
}
