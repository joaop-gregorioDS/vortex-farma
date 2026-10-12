"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const preferenceKey = "vf-font-scale";
const swaggerUrl = process.env.NEXT_PUBLIC_SWAGGER_URL?.trim();

export function PageTools() {
  const [scale, setScale] = useState(100);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(preferenceKey));
      if ([100, 125, 150, 175, 200].includes(saved)) {
        setScale(saved);
        document.documentElement.style.fontSize = `${saved}%`;
        document.documentElement.dataset.fontScale = String(saved);
      }
    } catch {
      // Font controls also work when browser storage is unavailable.
    }
  }, []);

  function changeScale(next: number) {
    setScale(next);
    document.documentElement.style.fontSize = `${next}%`;
    document.documentElement.dataset.fontScale = String(next);
    try {
      localStorage.setItem(preferenceKey, String(next));
    } catch {
      // Keep the preference for the current page even without storage.
    }
  }

  return (
    <div className="page-tools" role="group" aria-label="Atalhos da página">
      <button
        type="button"
        className="page-tool"
        onClick={() => changeScale(Math.min(scale + 25, 200))}
        disabled={scale === 200}
        aria-label={`Aumentar tamanho da fonte. Tamanho atual: ${scale}%`}
        title={`Aumentar fonte (atual: ${scale}%, máximo: 200%)`}
      >
        <strong aria-hidden="true">A+</strong> Fonte
      </button>
      {scale > 100 && (
        <button
          type="button"
          className="page-tool"
          onClick={() => changeScale(100)}
          aria-label="Restaurar tamanho da fonte para 100%"
          title="Restaurar tamanho da fonte"
        >
          {scale}% · Restaurar
        </button>
      )}
      <span className="visually-hidden" role="status">
        Tamanho da fonte: {scale}%
      </span>
      {swaggerUrl ? (
        <a
          className="page-tool"
          href={swaggerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Swagger (abre em nova aba)"
        >
          Swagger <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      ) : (
        <button
          type="button"
          className="page-tool"
          disabled
          aria-label="Swagger disponível em breve"
          title="Documentação da API disponível em breve"
        >
          Swagger · Em breve
        </button>
      )}
    </div>
  );
}
