import { NextResponse } from "next/server";
import { getPrivacy } from "@/lib/privacy";

export const runtime = "nodejs";

// Público: usado no cadastro (modal) e na página /privacidade.
export async function GET() {
  return NextResponse.json({ privacy: await getPrivacy() });
}
