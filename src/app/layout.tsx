import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Doc Broto — Ferramentas de PDF online",
  description:
    "Todas as ferramentas de que você precisa para trabalhar com PDFs, num só lugar. Juntar, dividir, comprimir, converter, girar, marca d'água e muito mais.",
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
          Doc Broto © {new Date().getFullYear()} — Ferramentas de PDF para a sua empresa.
        </footer>
      </body>
    </html>
  );
}
