import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { requireToolAccess } from "@/lib/server/access-guard";
import { grayscalePdf } from "@/lib/server/pdf-ops";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    await requireToolAccess("tons-de-cinza");
    const file = await readUpload(request, "file", /\.pdf$/i);
    const out = await grayscalePdf(await fileToBuffer(file));
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}-cinza.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
