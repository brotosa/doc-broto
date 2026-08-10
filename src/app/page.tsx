import { ToolGrid } from "@/components/ToolGrid";

export default function HomePage() {
  return (
    <div>
      <section className="mb-10 overflow-hidden rounded-4xl bg-brand-yellow px-6 py-14 text-center">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold text-brand-ink sm:text-4xl">
          Todas as ferramentas de PDF do Broto, num só lugar
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-brand-ink/80">
          Junte, divida, comprima, converta, proteja e transforme seus documentos
          com a linguagem e a simplicidade do Broto.
        </p>
      </section>
      <ToolGrid />
    </div>
  );
}
