import Link from "next/link";
export default function NotFound() {
  return (
    <div
      className="container empty-state"
      style={{ marginTop: 40, marginBottom: 40 }}
    >
      <span className="eyebrow">VORTEX FARMA</span>
      <h1>Este caminho ainda não existe.</h1>
      <p>Volte para a loja e encontre seu próximo cuidado.</p>
      <Link className="btn primary" href="/">
        Voltar ao início
      </Link>
    </div>
  );
}
