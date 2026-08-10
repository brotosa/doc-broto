"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { TOOLS, CATEGORY_LABELS, type ToolCategory } from "@/lib/tools";
import { ToolCard } from "./ToolCard";

const FILTERS: Array<{ key: "todas" | ToolCategory; label: string }> = [
  { key: "todas", label: "Todas" },
  { key: "organizar", label: CATEGORY_LABELS.organizar },
  { key: "otimizar", label: CATEGORY_LABELS.otimizar },
  { key: "converter", label: CATEGORY_LABELS.converter },
  { key: "editar", label: CATEGORY_LABELS.editar },
  { key: "seguranca", label: CATEGORY_LABELS.seguranca },
  { key: "intelligence", label: CATEGORY_LABELS.intelligence },
];

export function ToolGrid() {
  const [filter, setFilter] = useState<"todas" | ToolCategory>("todas");

  const visible =
    filter === "todas" ? TOOLS : TOOLS.filter((t) => t.category === filter);

  return (
    <div>
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              filter === f.key
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </div>
  );
}
