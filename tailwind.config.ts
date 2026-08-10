import type { Config } from "tailwindcss";

/**
 * Broto brand palette (Guia de marca Broto 2022 — brand/GuiaDeMarca-Broto-2022.pdf).
 * Principais: amarelo, azul, branco. Secundárias: verde, marrom (ink).
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // Azul — PANTONE 2369 C — cor de ação/links.
          DEFAULT: "#465EFF",
          dark: "#3346D6",
          // Amarelo — PANTONE 3945 C — fundo vibrante / destaque.
          yellow: "#FCFC30",
          // Verde — PANTONE 7479 C — secundária / sucesso / "Novo!".
          green: "#38DC6A",
          // Marrom/preto — PANTONE Black 4 C — texto escuro.
          ink: "#282313",
        },
      },
      fontFamily: {
        // Gordita é a tipografia da marca (comercial). Verdana é o fallback
        // de sistema definido pela própria marca.
        sans: ["Gordita", "Verdana", "Geneva", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
