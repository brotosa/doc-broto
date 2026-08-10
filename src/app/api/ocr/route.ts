import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { ocrPdf } from "@/lib/server/pdf-ops";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const lang = new URL(request.url).searchParams.get("lang") || "por+eng";
    const file = await readUpload(request, "file", /\.pdf$/i);
    const out = await ocrPdf(await fileToBuffer(file), lang);
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}-ocr.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
