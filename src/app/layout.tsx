import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { ResultOverlay } from "@/components/ResultOverlay";

export const metadata: Metadata = {
  title: "Broto — Ferramentas de PDF",
  description:
    "Todas as ferramentas de PDF do Broto, num só lugar. Juntar, dividir, comprimir, converter, proteger, OCR, IA e muito mais.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-sm text-gray-400">
          Broto © {new Date().getFullYear()} — Seu jeito digital de fazer agro.
        </footer>
        <ResultOverlay />
      </body>
    </html>
  );
}
