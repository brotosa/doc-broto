"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Vigia a inatividade do usuário:
//  - enquanto há atividade (mouse/teclado/rolagem/toque), manda um "heartbeat"
//    para /api/session (renova a janela deslizante da sessão);
//  - se ficar inativo além do limite definido pelo admin, faz logout e volta
//    para a tela de login.
// Se o timeout estiver desligado (idleMinutes = 0) ou não houver sessão, fica inerte.
export function IdleGuard() {
  const idleMs = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBeat = useRef(0);
  // Re-checa a sessão a cada troca de rota (ex.: depois do login por SPA,
  // quando o componente não remonta, mas a rota muda de /login para /).
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    const logout = async () => {
      try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
      window.location.href = "/login";
    };

    const resetTimer = () => {
      if (!idleMs.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, idleMs.current);
    };

    // Renova a sessão no servidor, no máximo uma vez a cada 60s.
    const beat = () => {
      const now = Date.now();
      if (now - lastBeat.current < 60_000) return;
      lastBeat.current = now;
      fetch("/api/session").catch(() => {});
    };

    const onActivity = () => { beat(); resetTimer(); };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

    (async () => {
      try {
        const r = await fetch("/api/session");
        if (!r.ok) return; // sem sessão (ex.: tela de login) → não faz nada
        const d = await r.json();
        if (!active || !d.idleMinutes || d.idleMinutes <= 0) return; // desligado
        idleMs.current = d.idleMinutes * 60_000;
        lastBeat.current = Date.now();
        events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
        resetTimer();
      } catch { /* ignora */ }
    })();

    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [pathname]);

  return null;
}
