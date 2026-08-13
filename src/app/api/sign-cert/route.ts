import { fileToBuffer, fileResponse, errorResponse, MAX_UPLOAD_BYTES } from "@/lib/server/http";
import { signPdfWithCert } from "@/lib/server/pdf-sign";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const pdf = form.get("file");
    const cert = form.get("cert");
    const password = String(form.get("password") ?? "");
    if (!(pdf instanceof File) || !/\.pdf$/i.test(pdf.name)) {
      throw new ProcessingError("Envie o PDF a ser assinado.");
    }
    if (!(cert instanceof File) || !/\.(pfx|p12)$/i.test(cert.name)) {
      throw new ProcessingError("Envie o certificado A1 no formato .pfx ou .p12.");
    }
    if (!password) throw new ProcessingError("Informe a senha do certificado.");
    if (pdf.size === 0 || cert.size === 0) throw new ProcessingError("Arquivo vazio.");
    if (pdf.size > MAX_UPLOAD_BYTES) throw new ProcessingError("PDF excede o limite de 100 MB.");

    const visible = String(form.get("visible") ?? "true") !== "false";
    const pageRaw = parseInt(String(form.get("page") ?? "1"), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw - 1 : 0; // 1-based → 0-based
    const cornerRaw = String(form.get("corner") ?? "br");
    const corner = (["br", "bl", "tr", "tl"] as const).includes(cornerRaw as never)
      ? (cornerRaw as "br" | "bl" | "tr" | "tl")
      : "br";

    const timestamp = String(form.get("timestamp") ?? "false") === "true";
    const out = await signPdfWithCert(await fileToBuffer(pdf), await fileToBuffer(cert), {
      password,
      reason: String(form.get("reason") ?? "").slice(0, 200),
      location: String(form.get("location") ?? "").slice(0, 120),
      visible,
      page,
      corner,
      timestamp,
    });
    const base = pdf.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}-assinado.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
