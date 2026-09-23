"use client";

import { useMemo, useState } from "react";
import { TOOLS, CATEGORY_LABELS, PRESET_LABELS, presetSlugs, type PresetName, type ToolCategory } from "@/lib/tools";

const CAT_ORDER: ToolCategory[] = ["organizar", "otimizar", "converter", "editar", "seguranca", "intelligence"];
function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function order(a: string, b: string) {
  const ta = TOOLS.find((t) => t.slug === a)!, tb = TOOLS.find((t) => t.slug === b)!;
  const c = CAT_ORDER.indexOf(ta.category) - CAT_ORDER.indexOf(tb.category);
  return c !== 0 ? c : ta.title.localeCompare(tb.title);
}
function title(slug: string) {
  return TOOLS.find((t) => t.slug === slug)?.title ?? slug;
}

// Seletor de transferência (dual-list) de ferramentas, com presets, atalhos por
// categoria e busca. `value` = slugs selecionados; onChange devolve a nova lista.
export function ToolPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const selected = useMemo(() => new Set(value), [value]);
  const [markSel, setMarkSel] = useState<Set<string>>(new Set());
  const [markAvail, setMarkAvail] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const available = TOOLS.map((t) => t.slug).filter((s) => !selected.has(s)).sort(order);
  const chosen = [...value].sort(order);
  const nq = norm(q.trim());
  const availView = nq ? available.filter((s) => norm(title(s)).includes(nq)) : available;

  const set = (slugs: string[]) => { onChange([...new Set(slugs)]); setMarkSel(new Set()); setMarkAvail(new Set()); };
  const addAll = () => set([...value, ...availView]);
  const removeAll = () => set([]);
  const addMarked = () => { set([...value, ...markAvail]); };
  const removeMarked = () => { set(value.filter((s) => !markSel.has(s))); };
  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, slug: string) =>
    setter((prev) => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  const addCategory = (cat: ToolCategory) =>
    set([...value, ...TOOLS.filter((t) => t.category === cat).map((t) => t.slug)]);

  const Pane = ({ items, marks, onItem, empty }: { items: string[]; marks: Set<string>; onItem: (s: string) => void; empty: string }) => (
    <div className="h-60 flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
      {items.length === 0 ? (
        <p className="p-3 text-xs text-gray-400">{empty}</p>
      ) : (
        items.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onItem(s)}
            className={`block w-full truncate px-3 py-1.5 text-left text-sm ${marks.has(s) ? "bg-brand/10 text-brand" : "text-gray-700 hover:bg-gray-50"}`}
          >
            {title(s)}
          </button>
        ))
      )}
    </div>
  );

  return (
    <div>
      {/* Presets + categorias */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Presets:</span>
        {(Object.keys(PRESET_LABELS) as PresetName[]).map((p) => (
          <button key={p} type="button" onClick={() => set(presetSlugs(p))}
            className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/20">
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-500">+ categoria:</span>
        {CAT_ORDER.map((c) => (
          <button key={c} type="button" onClick={() => addCategory(c)}
            className="rounded-md border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:border-brand hover:text-brand">
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">DISPONÍVEIS ({available.length})</span>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
            className="mb-1 w-full rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-brand" />
          <Pane items={availView} marks={markAvail} onItem={(s) => toggle(setMarkAvail, s)} empty="Nada disponível." />
        </div>

        <div className="flex flex-col justify-center gap-1.5">
          <button type="button" onClick={addAll} title="Adicionar todas" className="rounded-md border border-gray-200 px-2 py-1 text-xs font-bold text-gray-600 hover:border-brand hover:text-brand">»</button>
          <button type="button" onClick={addMarked} title="Adicionar marcadas" className="rounded-md border border-gray-200 px-2 py-1 text-xs font-bold text-gray-600 hover:border-brand hover:text-brand">›</button>
          <button type="button" onClick={removeMarked} title="Remover marcadas" className="rounded-md border border-gray-200 px-2 py-1 text-xs font-bold text-gray-600 hover:border-brand hover:text-brand">‹</button>
          <button type="button" onClick={removeAll} title="Remover todas" className="rounded-md border border-gray-200 px-2 py-1 text-xs font-bold text-gray-600 hover:border-brand hover:text-brand">«</button>
        </div>

        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">SELECIONADAS ({value.length})</span>
          </div>
          <div className="mb-1 h-[26px]" />
          <Pane items={chosen} marks={markSel} onItem={(s) => toggle(setMarkSel, s)} empty="Nenhuma selecionada." />
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-400">Clique para marcar; use os botões para mover. Dica: comece por um preset e ajuste.</p>
    </div>
  );
}
