"use client";

import { useEffect, useState } from "react";
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
} from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("formularios-pdf")!;

type Field =
  | { kind: "text"; name: string; value: string }
  | { kind: "checkbox"; name: string; value: boolean }
  | { kind: "choice"; name: string; value: string; options: string[] };

export default function FormsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [flatten, setFlatten] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (files.length === 0) {
        setFields([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const bytes = new Uint8Array(await files[0].arrayBuffer());
        const doc = await PDFDocument.load(bytes);
        const form = doc.getForm();
        const detected: Field[] = [];
        for (const f of form.getFields()) {
          const name = f.getName();
          if (f instanceof PDFTextField) {
            detected.push({ kind: "text", name, value: f.getText() ?? "" });
          } else if (f instanceof PDFCheckBox) {
            detected.push({ kind: "checkbox", name, value: f.isChecked() });
          } else if (f instanceof PDFDropdown || f instanceof PDFOptionList) {
            detected.push({ kind: "choice", name, value: f.getSelected()[0] ?? "", options: f.getOptions() });
          } else if (f instanceof PDFRadioGroup) {
            detected.push({ kind: "choice", name, value: f.getSelected() ?? "", options: f.getOptions() });
          }
        }
        if (!cancelled) {
          setFields(detected);
          if (detected.length === 0)
            setError("Nenhum campo de formulário interativo foi detectado neste PDF.");
        }
      } catch (e) {
        if (!cancelled) setError("Não foi possível ler o PDF.");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const update = (name: string, value: string | boolean) =>
    setFields((fs) => fs.map((f) => (f.name === name ? { ...f, value } as Field : f)));

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      const form = doc.getForm();
      for (const f of fields) {
        try {
          if (f.kind === "text") form.getTextField(f.name).setText(f.value);
          else if (f.kind === "checkbox") {
            const cb = form.getCheckBox(f.name);
            f.value ? cb.check() : cb.uncheck();
          } else if (f.kind === "choice" && f.value) {
            try {
              form.getDropdown(f.name).select(f.value);
            } catch {
              try {
                form.getRadioGroup(f.name).select(f.value);
              } catch {
                form.getOptionList(f.name).select(f.value);
              }
            }
          }
        } catch (e) {
          console.warn("campo", f.name, e);
        }
      }
      if (flatten) form.flatten();
      downloadBlob(await doc.save(), "formulario-preenchido.pdf");
    } catch (e) {
      setError("Não foi possível preencher o formulário.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF com formulário" />

      {loading && <p className="mt-6 text-center text-sm text-gray-500">Detectando campos...</p>}

      {fields.length > 0 && (
        <div className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-600">
            {fields.length} campo(s) detectado(s)
          </p>
          {fields.map((f) => (
            <div key={f.name}>
              {f.kind === "text" && (
                <label className="block text-sm">
                  <span className="mb-1 block text-gray-600">{f.name}</span>
                  <input
                    value={f.value}
                    onChange={(e) => update(f.name, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
                  />
                </label>
              )}
              {f.kind === "checkbox" && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={f.value}
                    onChange={(e) => update(f.name, e.target.checked)}
                  />
                  {f.name}
                </label>
              )}
              {f.kind === "choice" && (
                <label className="block text-sm">
                  <span className="mb-1 block text-gray-600">{f.name}</span>
                  <select
                    value={f.value}
                    onChange={(e) => update(f.name, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
                  >
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ))}
          <label className="flex items-center gap-2 border-t border-gray-100 pt-3 text-sm text-gray-600">
            <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} />
            Achatar (tornar não editável após preencher)
          </label>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || fields.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Preenchendo..." : "Preencher e baixar"}
      </button>
    </ToolShell>
  );
}
