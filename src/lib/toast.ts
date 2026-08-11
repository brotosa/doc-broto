// Toast simples (DOM puro) para mensagens de sucesso — funciona em qualquer
// página, sem depender de React. Usado ao concluir uma operação/documento.

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

export function showToast(message: string, kind: "success" | "error" = "success"): void {
  if (typeof document === "undefined") return;

  let root = document.getElementById("broto-toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "broto-toast-root";
    root.style.cssText =
      "position:fixed;left:0;right:0;bottom:24px;display:flex;flex-direction:column;align-items:center;gap:8px;z-index:9999;pointer-events:none";
    document.body.appendChild(root);
  }

  const bg = kind === "success" ? "#38DC6A" : "#EF4444";
  const fg = kind === "success" ? "#08331b" : "#ffffff";
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.style.cssText =
    `pointer-events:auto;display:flex;align-items:center;gap:10px;background:${bg};color:${fg};` +
    "font-weight:700;font-family:Verdana,Geneva,sans-serif;font-size:14px;padding:12px 18px;" +
    "border-radius:14px;box-shadow:0 12px 34px rgba(38,54,120,.18);opacity:0;transform:translateY(10px);" +
    "transition:opacity .2s ease,transform .2s ease;max-width:90vw";
  el.innerHTML =
    `<span style="display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.12);font-size:13px">${kind === "success" ? "✓" : "!"}</span>` +
    escapeHtml(message);

  root.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "none";
  });
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    setTimeout(() => el.remove(), 260);
  }, 3200);
}
