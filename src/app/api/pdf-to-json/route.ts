import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { requireToolAccess } from "@/lib/server/access-guard";
import { pdfToJson } from "@/lib/server/pdf-ops";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    await requireToolAccess("pdf-para-json");
    const file = await readUpload(request, "file", /\.pdf$/i);
    const out = await pdfToJson(await fileToBuffer(file), file.name);
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}.json`, "application/json; charset=utf-8");
  } catch (err) {
    return errorResponse(err);
  }
}
