/**
 * Broto logo — símbolo de "broto" (traços que crescem e curvam, no estilo do
 * grafismo da marca: linhas com cantos arredondados, desenho aberto) + wordmark.
 * Cores conforme o Guia de marca: verde #38DC6A, azul #465EFF.
 */
export function BrotoLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
        {/* Traços que sobem e curvam para a direita — broto crescendo. */}
        <path
          d="M8 44 V22 a14 14 0 0 1 14 -14 h22"
          fill="none"
          stroke="#38DC6A"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M16 44 V26 a8 8 0 0 1 8 -8 h20"
          fill="none"
          stroke="#465EFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M8 44 h6" stroke="#465EFF" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 150 44" className="h-6 w-auto" aria-label="broto">
        <text
          x="0"
          y="34"
          fontFamily="Gordita, Verdana, sans-serif"
          fontSize="40"
          fontWeight="700"
          fill="#465EFF"
        >
          broto
        </text>
      </svg>
    </span>
  );
}
