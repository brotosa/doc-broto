import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { requireToolAccess } from "@/lib/server/access-guard";
import { compressPdf } from "@/lib/server/pdf-ops";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    await requireToolAccess("comprimir-pdf");
    const level = (new URL(request.url).searchParams.get("level") || "recommended") as
      | "less"
      | "recommended"
      | "extreme";
    const file = await readUpload(request, "file", /\.pdf$/i);
    const out = await compressPdf(await fileToBuffer(file), level);
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}-comprimido.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
