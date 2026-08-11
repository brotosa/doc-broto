"use client";

export function LogoutButton() {
  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button
      onClick={sair}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-brand"
    >
      Sair
    </button>
  );
}
