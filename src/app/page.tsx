import { ToolGrid } from "@/components/ToolGrid";

export default function HomePage() {
  return (
    <div>
      <section className="mb-10 text-center">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold text-gray-900 sm:text-4xl">
          Todas as ferramentas de PDF de que a sua empresa precisa
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-gray-500">
          Junte, divida, comprima, converta, gire e edite arquivos PDF com
          facilidade. Simples, rápido e direto no navegador.
        </p>
      </section>
      <ToolGrid />
    </div>
  );
}
