import { NextResponse } from "next/server";
import { ProcessingError } from "./exec";
import { maxUploadBytes } from "./limits";

// Limite padrão (fallback). O limite efetivo é configurável pelo admin e lido
// via `maxUploadBytes()`; esta constante permanece para compatibilidade.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

/** Valida o tamanho de um arquivo contra o limite configurável do admin. */
export async function assertUploadSize(size: number): Promise<void> {
  if (size === 0) throw new ProcessingError("Arquivo vazio.");
  const max = await maxUploadBytes();
  if (size > max) {
    throw new ProcessingError(`Arquivo excede o limite de ${Math.round(max / (1024 * 1024))} MB.`);
  }
}

/** Pull a single required File out of multipart/form-data with validation. */
export async function readUpload(
  request: Request,
  field = "file",
  accept?: RegExp
): Promise<File> {
  const form = await request.formData();
  const file = form.get(field);
  if (!(file instanceof File)) {
    throw new ProcessingError(`Campo "${field}" ausente ou inválido.`);
  }
  await assertUploadSize(file.size);
  if (accept && !accept.test(file.name)) {
    throw new ProcessingError("Formato de arquivo não suportado.");
  }
  return file;
}

export async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

/** Standard binary file download response. `warning` vira o header X-Broto-Aviso. */
export function fileResponse(
  data: Buffer | Uint8Array,
  filename: string,
  contentType = "application/pdf",
  warning?: string
): NextResponse {
  const body = new Uint8Array(data);
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    "Content-Length": String(body.byteLength),
    "Cache-Control": "no-store",
  };
  if (warning) {
    headers["X-Broto-Aviso"] = encodeURIComponent(warning);
    // Necessário para o header ser visível ao fetch do navegador.
    headers["Access-Control-Expose-Headers"] = "X-Broto-Aviso";
  }
  return new NextResponse(body, { status: 200, headers });
}

/** Convert thrown errors into a JSON error response. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ProcessingError) {
    console.error("[ProcessingError]", err.message, err.detail ?? "");
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("[UnexpectedError]", err);
  return NextResponse.json(
    { error: "Erro inesperado ao processar o arquivo." },
    { status: 500 }
  );
}
