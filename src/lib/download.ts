import { showToast } from "./toast";

// Ao concluir, NÃO baixa automático: dispara um evento que abre a tela de
// resultado ("Arquivo pronto"), onde o usuário escolhe Baixar ou Gerar novo.
export function downloadBlob(data: Uint8Array | Blob, filename: string, type = "application/pdf") {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("broto:result", { detail: { blob, filename } }));
  } else {
    performDownload(blob, filename);
  }
}

// Faz o download de verdade (chamado pelo botão "Baixar arquivo" da tela).
export function performDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Download iniciado.");
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
