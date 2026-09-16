import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { IdleGuard } from "@/components/IdleGuard";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

export const metadata: Metadata = {
  title: "Broto — Ferramentas de PDF",
  description:
    "Todas as ferramentas de PDF do Broto, num só lugar. Juntar, dividir, comprimir, converter, proteger, OCR, IA e muito mais.",
  applicationName: "Broto PDF",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Broto PDF" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCFC30" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
  ],
};

// Aplica o tema salvo antes da pintura (evita "flash" de tela clara/escura).
const THEME_INIT = `(function(){try{var t=localStorage.getItem('broto-theme');var d=t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-screen antialiased">
        <IdleGuard />
        <KeyboardShortcuts />
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-sm text-gray-400">
          Broto © {new Date().getFullYear()} — Seu jeito digital de fazer agro.
          <span className="mx-2">·</span>
          <a href="/privacidade" className="underline hover:text-brand">Política de Privacidade</a>
        </footer>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

// Registra o service worker (PWA). Componente inline mínimo, client-side.
function ServiceWorkerRegister() {
  const js = `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
