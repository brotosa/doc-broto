import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Broto — Ferramentas de PDF",
    short_name: "Broto PDF",
    description:
      "Todas as ferramentas de PDF do Broto: juntar, dividir, comprimir, converter, proteger, OCR e muito mais.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#FCFC30",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
