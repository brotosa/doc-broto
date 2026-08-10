import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { pdfToPdfA } from "@/lib/server/pdf-ops";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const file = await readUpload(request, "file", /\.pdf$/i);
    const out = await pdfToPdfA(await fileToBuffer(file));
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}-pdfa.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
