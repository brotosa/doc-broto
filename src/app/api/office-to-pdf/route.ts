import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { officeToPdf } from "@/lib/server/pdf-ops";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const file = await readUpload(request, "file", /\.(docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|csv)$/i);
    const pdf = await officeToPdf(await fileToBuffer(file), file.name);
    const base = file.name.replace(/\.[^.]+$/, "");
    return fileResponse(pdf, `${base}.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
