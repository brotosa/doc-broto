"use client";

import { useState } from "react";

// Screenshot ilustrativo do manual. Se a imagem não existir (ex.: ferramenta
// recém-criada sem captura ainda), some silenciosamente em vez de mostrar um
// ícone de imagem quebrada.
export function HelpShot({ name, alt }: { name: string; alt: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <img
      src={`/ajuda/${name}.png`}
      alt={alt}
      loading="lazy"
      onError={() => setOk(false)}
      className="mt-4 w-full rounded-xl border border-gray-200 shadow-sm"
    />
  );
}
