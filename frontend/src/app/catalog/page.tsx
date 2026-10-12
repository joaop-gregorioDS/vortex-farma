import { Suspense } from "react";
import { Catalog } from "@/components/Products";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container loading-page">Carregando catálogo…</div>
      }
    >
      <Catalog />
    </Suspense>
  );
}
