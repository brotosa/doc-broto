import Link from "next/link";
import type { Tool } from "@/lib/tools";

export function ToolShell({
  tool,
  children,
}: {
  tool: Tool;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand"
      >
        ← Todas as ferramentas
      </Link>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{tool.title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-gray-500">{tool.description}</p>
      </div>
      {children}
    </div>
  );
}
