import { NextResponse } from "next/server";
import { readUpload, fileToBuffer, errorResponse } from "@/lib/server/http";
import { pdfToMarkdown } from "@/lib/server/ai";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const file = await readUpload(request, "file", /\.pdf$/i);
    const result = await pdfToMarkdown(await fileToBuffer(file));
    return NextResponse.json({ result });
  } catch (err) {
    return errorResponse(err);
  }
}
