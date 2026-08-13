import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { pdfToOfficePy } from "@/lib/server/pdf-office";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const file = await readUpload(request, "file", /\.pdf$/i);
    const out = await pdfToOfficePy(await fileToBuffer(file), "csv");
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}.csv`, "text/csv; charset=utf-8");
  } catch (err) {
    return errorResponse(err);
  }
}
