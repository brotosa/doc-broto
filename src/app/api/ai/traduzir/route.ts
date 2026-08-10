import { NextResponse } from "next/server";
import { readUpload, fileToBuffer, errorResponse } from "@/lib/server/http";
import { translatePdf } from "@/lib/server/ai";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const target = new URL(request.url).searchParams.get("target") || "português do Brasil";
    const file = await readUpload(request, "file", /\.pdf$/i);
    const result = await translatePdf(await fileToBuffer(file), target);
    return NextResponse.json({ result });
  } catch (err) {
    return errorResponse(err);
  }
}
