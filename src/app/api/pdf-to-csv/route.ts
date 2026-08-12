import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { pdfToCsv } from "@/lib/server/pdf-to-xlsx";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const file = await readUpload(request, "file", /\.pdf$/i);
    const out = await pdfToCsv(await fileToBuffer(file));
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}.csv`, "text/csv; charset=utf-8");
  } catch (err) {
    return errorResponse(err);
  }
}
