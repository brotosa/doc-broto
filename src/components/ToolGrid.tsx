"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { TOOLS, CATEGORY_LABELS, type Tool, type ToolCategory } from "@/lib/tools";
import styles from "./ToolGrid.module.css";

const FILTERS: Array<{ key: "todas" | ToolCategory; label: string; dot: string }> = [
  { key: "todas", label: "Todas", dot: "linear-gradient(90deg,#465EFF,#38DC6A)" },
  { key: "organizar", label: CATEGORY_LABELS.organizar, dot: "#465EFF" },
  { key: "otimizar", label: CATEGORY_LABELS.otimizar, dot: "#38DC6A" },
  { key: "converter", label: CATEGORY_LABELS.converter, dot: "#465EFF" },
  { key: "editar", label: CATEGORY_LABELS.editar, dot: "#38DC6A" },
  { key: "seguranca", label: CATEGORY_LABELS.seguranca, dot: "#282313" },
  { key: "intelligence", label: CATEGORY_LABELS.intelligence, dot: "#F4E400" },
];

// Destaques do mosaico (aplicados apenas em "Todas").
const FEATURED: Record<string, "featBlue" | "featGreen"> = {
  "juntar-pdf": "featBlue",
  "comprimir-pdf": "featGreen",
};
const WIDE = new Set(["pdf-para-word", "ocr-pdf"]);

function FeaturedCell({ tool, i, variant }: { tool: Tool; i: number; variant: "featBlue" | "featGreen" }) {
  return (
    <Link
      href={`/${tool.slug}`}
      className={clsx(styles.cell, styles.feat, styles[variant])}
      style={{ "--i": i } as CSSProperties}
    >
      <span className={styles.sheen} />
      <div className={styles.cnt}>
        <div className={styles.featIcon} dangerouslySetInnerHTML={{ __html: tool.glyph }} />
        <h3 className={styles.title}>{tool.title}</h3>
        <p className={styles.desc}>{tool.description}</p>
      </div>
    </Link>
  );
}

function Cell({ tool, i, wide }: { tool: Tool; i: number; wide: boolean }) {
  const body = (
    <>
      <span className={styles.glow} />
      <span className={styles.inner} />
      {!tool.ready && <span className={styles.soon}>Em breve</span>}
      <div className={styles.cnt}>
        <div
          className={clsx("grid h-11 w-11 place-items-center rounded-xl text-lg font-bold", tool.color, styles.icon)}
          dangerouslySetInnerHTML={{ __html: tool.glyph }}
        />
        <h3 className={styles.title}>{tool.title}</h3>
        <p className={styles.desc}>{tool.description}</p>
        {tool.ready && <span className={styles.go}>Abrir →</span>}
      </div>
    </>
  );

  const cls = clsx(styles.cell, wide && styles.wide, !tool.ready && styles.disabled);
  const style = { "--i": i } as CSSProperties;

  return tool.ready ? (
    <Link href={`/${tool.slug}`} className={cls} style={style}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

export function ToolGrid() {
  const [filter, setFilter] = useState<"todas" | ToolCategory>("todas");
  const isAll = filter === "todas";
  const visible = isAll ? TOOLS : TOOLS.filter((t) => t.category === filter);

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                active ? "bg-brand text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:-translate-y-0.5 hover:shadow-sm"
              )}
            >
              <span className="h-2 w-2 rounded-sm" style={{ background: f.dot }} />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* key={filter} remonta a grade → a cascata roda de novo ao filtrar */}
      <div key={filter} className={styles.grid}>
        {visible.map((tool, i) => {
          const variant = isAll ? FEATURED[tool.slug] : undefined;
          if (variant) return <FeaturedCell key={tool.slug} tool={tool} i={i} variant={variant} />;
          return <Cell key={tool.slug} tool={tool} i={i} wide={isAll && WIDE.has(tool.slug)} />;
        })}
      </div>
    </div>
  );
}
