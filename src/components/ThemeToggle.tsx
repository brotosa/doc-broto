"use client";

import { useEffect, useState } from "react";

// Alterna claro/escuro. O tema é aplicado antes da pintura por um script inline
// no layout (evita "flash"); aqui só sincronizamos o estado e persistimos.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("broto-theme", next ? "dark" : "light");
    } catch {
      /* ignora */
    }
    setDark(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
      className="rounded-lg px-2.5 py-1.5 text-base text-gray-600 transition hover:bg-gray-100 hover:text-brand"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
