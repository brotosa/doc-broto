import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { pdfToMarkdown } from "@/lib/server/pdf-ops";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const file = await readUpload(request, "file", /\.pdf$/i);
    const out = await pdfToMarkdown(await fileToBuffer(file));
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}.md`, "text/markdown; charset=utf-8");
  } catch (err) {
    return errorResponse(err);
  }
}
