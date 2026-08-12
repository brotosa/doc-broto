import { showToast } from "./toast";
import { getTool } from "./tools";

// Ao concluir, NÃO baixa automático: dispara um evento que abre a tela de
// resultado ("Arquivo pronto"), onde o usuário escolhe Baixar ou Gerar novo.
export function downloadBlob(data: Uint8Array | Blob, filename: string, type = "application/pdf") {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("broto:result", { detail: { blob, filename, path: window.location.pathname } })
    );
    logActivity(filename);
  } else {
    performDownload(blob, filename);
  }
}

// Registra o uso da ferramenta no log de atividade (fire-and-forget; nunca
// atrapalha o resultado). A ferramenta é deduzida pela rota atual.
function logActivity(filename: string) {
  try {
    const slug = window.location.pathname.replace(/^\//, "").split("/")[0];
    const tool = getTool(slug);
    if (!tool) return;
    fetch("/api/activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: tool.title, fileName: filename, tool: slug }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignora */
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
