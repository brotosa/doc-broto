import { NextResponse } from "next/server";
import { ProcessingError } from "./exec";

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

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
  if (file.size === 0) throw new ProcessingError("Arquivo vazio.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ProcessingError("Arquivo excede o limite de 100 MB.");
  }
  if (accept && !accept.test(file.name)) {
    throw new ProcessingError("Formato de arquivo não suportado.");
  }
  return file;
}

export async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

/** Standard binary file download response. */
export function fileResponse(
  data: Buffer | Uint8Array,
  filename: string,
  contentType = "application/pdf"
): NextResponse {
  const body = new Uint8Array(data);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "no-store",
    },
  });
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
