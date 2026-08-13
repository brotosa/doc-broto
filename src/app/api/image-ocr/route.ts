import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { imageToText } from "@/lib/server/pdf-ops";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get("lang") || "por+eng";
    const lang = raw.trim().replace(/\s+/g, "+") || "por+eng";
    const file = await readUpload(request, "file", /\.(jpe?g|png|tiff?|bmp|webp)$/i);
    const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".png").toLowerCase();
    const out = await imageToText(await fileToBuffer(file), ext, lang);
    const base = file.name.replace(/\.[^.]+$/, "");
    return fileResponse(out, `${base}.txt`, "text/plain; charset=utf-8");
  } catch (err) {
    return errorResponse(err);
  }
}
