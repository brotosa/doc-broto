import Link from "next/link";
import { clsx } from "clsx";
import type { Tool } from "@/lib/tools";

export function ToolCard({ tool }: { tool: Tool }) {
  const card = (
    <div
      className={clsx(
        "group relative flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 transition",
        tool.ready
          ? "hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg"
          : "opacity-70"
      )}
    >
      {tool.isNew && (
        <span className="absolute right-3 top-3 rounded-md bg-brand-green px-2 py-0.5 text-xs font-semibold text-white">
          Novo!
        </span>
      )}
      {!tool.ready && !tool.isNew && (
        <span className="absolute right-3 top-3 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          Em breve
        </span>
      )}
      <div
        className={clsx(
          "mb-4 grid h-11 w-11 place-items-center rounded-xl text-lg font-bold",
          tool.color
        )}
        dangerouslySetInnerHTML={{ __html: tool.glyph }}
      />
      <h3 className="mb-1 font-semibold text-gray-900">{tool.title}</h3>
      <p className="text-sm leading-relaxed text-gray-500">{tool.description}</p>
    </div>
  );

  if (!tool.ready) {
    return <div className="h-full cursor-not-allowed">{card}</div>;
  }

  return (
    <Link href={`/${tool.slug}`} className="h-full">
      {card}
    </Link>
  );
}
