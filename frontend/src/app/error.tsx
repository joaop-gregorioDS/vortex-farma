"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div
      className="container empty-state"
      style={{ marginTop: 40, marginBottom: 40 }}
    >
      <h1>Não foi possível abrir esta página.</h1>
      <p>Tente novamente para continuar sua demonstração.</p>
      <button className="btn primary" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
