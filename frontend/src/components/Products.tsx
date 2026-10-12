"use client";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  ShieldCheck,
  Sparkles,
  Heart,
  Truck,
  Store,
  Pill,
  Leaf,
  Droplets,
  Baby,
  Sun,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Product } from "@/lib/types";
import { money, categories } from "@/lib/types";
import { useDemo } from "./Provider";
import { ProductArt, HeroArt } from "./Artwork";
export function ProductCard({ product: p }: { product: Product }) {
  const demo = useDemo();
  return (
    <article className="product-card">
      <Link href={"/product/" + p.id} className="product-picture">
        {p.originalPrice > p.price && (
          <span className="discount-badge">
            −{Math.round((1 - p.price / p.originalPrice) * 100)}%
          </span>
        )}
        <ProductArt shape={p.shape} color={p.color} />
        <span className="picture-arrow">
          <ArrowRight size={16} />
        </span>
      </Link>
      <div className="product-info">
        <span className="product-brand">{p.brand}</span>
        <Link href={"/product/" + p.id} className="product-name">
          {p.name}
        </Link>
        <p>{p.presentation}</p>
        <div className="product-meta">
          {p.requiresReview ? (
            <span>
              <ShieldCheck size={12} />
              Receita simulada
            </span>
          ) : (
            <span>Seu cuidado, todos os dias</span>
          )}
        </div>
        <div className="price-row">
          <div>
            {p.originalPrice > p.price && <del>{money(p.originalPrice)}</del>}
            <strong>{money(p.price)}</strong>
          </div>
          <button
            className="add-button"
            aria-label={"Adicionar " + p.name}
            disabled={!p.available || demo.loading}
            onClick={() => demo.add(p)}
          >
            <Plus size={20} />
          </button>
        </div>
        {!p.available && (
          <small className="out-stock">Indisponível nesta unidade</small>
        )}
      </div>
    </article>
  );
}
export function Skeletons() {
  return (
    <div className="product-grid">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="product-skeleton" />
      ))}
    </div>
  );
}
const categoryIcons = [Pill, Sun, Leaf, Droplets, Sparkles, Baby];
export function Home() {
  const { products, loading } = useDemo();
  return (
    <div className="container store-main">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span />
            CUIDAR DE VOCÊ É O NOSSO JEITO
          </span>
          <h1>
            Pequenos cuidados.
            <br />
            <em>Mais vida.</em>
          </h1>
          <p>
            Saúde, beleza e bem-estar para cada momento.
            <br />
            Seu próximo ritual de cuidado começa aqui.
          </p>
          <Link className="btn primary" href="/catalog">
            Encontre seu cuidado
            <ArrowRight size={17} />
          </Link>
          <div className="hero-proof">
            <span className="proof-icon">
              <Heart size={14} />
            </span>{" "}
            Feito para o seu dia a dia
          </div>
        </div>
        <HeroArt />
        <div className="hero-index">
          <span>01</span> / 03
        </div>
      </section>
      <section className="benefits">
        <div>
          <Truck />
          <span>
            <strong>Cuidado na sua porta</strong>
            <small>Entrega simulada na sua região</small>
          </span>
        </div>
        <div>
          <Store />
          <span>
            <strong>Compre e retire</strong>
            <small>Escolha a unidade mais próxima</small>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <strong>Uma experiência conectada</strong>
            <small>Da sua compra à nossa gestão</small>
          </span>
        </div>
      </section>
      <section className="category-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PARA CADA MOMENTO</span>
            <h2>Como podemos cuidar de você?</h2>
          </div>
          <Link href="/catalog">
            Ver todas
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="category-grid">
          {categories.map((c, i) => {
            const Icon = categoryIcons[i];
            return (
              <Link key={c} href={"/catalog?category=" + encodeURIComponent(c)}>
                <span className={"category-icon cat-" + i}>
                  <Icon size={25} strokeWidth={1.5} />
                </span>
                <strong>{c}</strong>
                <ArrowRight size={14} />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="featured-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BONS CUIDADOS, MELHORES ESCOLHAS</span>
            <h2>
              Favoritos da semana<span className="heading-dot">.</span>
            </h2>
          </div>
          <Link href="/catalog?offers=true">
            Explorar ofertas
            <ArrowRight size={15} />
          </Link>
        </div>
        {loading ? (
          <Skeletons />
        ) : (
          <div className="product-grid">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
      <section className="care-banner">
        <span className="care-banner-icon">
          <Sparkles size={33} />
        </span>
        <div>
          <span className="eyebrow">UM TEMPO PARA VOCÊ</span>
          <h3>Sua pele. Seu ritual. Seu cuidado.</h3>
          <p>Descubra nossos essenciais de dermocosméticos.</p>
        </div>
        <Link
          className="btn secondary"
          href="/catalog?category=Dermocosméticos"
        >
          Conhecer a seleção
          <ArrowRight size={16} />
        </Link>
      </section>
      <section className="lab-teaser">
        <span className="lab-teaser-mark">
          V<span>↗</span>
        </span>
        <div>
          <span className="eyebrow">ALÉM DA VITRINE</span>
          <h3>Cada cuidado tem uma operação por trás.</h3>
          <p>
            Explore estoque, lotes e pedidos no painel conectado a esta loja.
          </p>
        </div>
        <Link href="/admin">
          Conheça a gestão
          <ArrowUpRightLocal />
        </Link>
      </section>
    </div>
  );
}
function ArrowUpRightLocal() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}
export function Catalog() {
  const params = useSearchParams(),
    demo = useDemo(),
    router = useRouter();
  const [category, setCategory] = useState(params.get("category") || ""),
    [q, setQ] = useState(params.get("q") || ""),
    [sort, setSort] = useState("featured"),
    [stockOnly, setStockOnly] = useState(false),
    [max, setMax] = useState(150);
  const search = q;
  useEffect(() => {
    setCategory(params.get("category") || "");
    setQ(params.get("q") || "");
  }, [params]);
  const items = demo.products
    .filter(
      (p) =>
        (!category || p.category === category) &&
        (!search ||
          (p.name + " " + p.presentation + " " + p.category)
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR"))) &&
        (!stockOnly || p.available > 0) &&
        p.price <= max &&
        (!params.get("offers") || p.originalPrice > p.price),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : Number(b.featured) - Number(a.featured),
    );
  return (
    <div className="container catalog-page">
      <div className="breadcrumbs">
        <Link href="/">Início</Link>
        <span>/</span>Produtos
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ESCOLHAS PARA O SEU BEM-ESTAR</span>
          <h1>
            {category || "Todos os cuidados"}
            <span className="heading-dot">.</span>
          </h1>
          <p>Encontre o que faz bem para a sua rotina.</p>
        </div>
        <span className="result-count">{items.length} produtos</span>
      </div>
      <div className="catalog-layout">
        <aside className="filter-panel">
          <h3>
            <SlidersHorizontal size={17} />
            Filtros
          </h3>
          <label className="filter-label">Categorias</label>
          <button
            className={!category ? "filter-option selected" : "filter-option"}
            onClick={() => setCategory("")}
          >
            Todos os produtos<span>{demo.products.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={
                category === c ? "filter-option selected" : "filter-option"
              }
              onClick={() => setCategory(c)}
            >
              {c}
              <span>
                {demo.products.filter((p) => p.category === c).length}
              </span>
            </button>
          ))}
          <div className="filter-divider" />
          <label className="filter-label" htmlFor="price-filter">
            Preço até {money(max)}
          </label>
          <input
            id="price-filter"
            type="range"
            min="10"
            max="150"
            value={max}
            onChange={(e) => setMax(+e.target.value)}
          />
          <label className="check-label">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(e) => setStockOnly(e.target.checked)}
            />
            Somente disponíveis
          </label>
          <button
            className="text-btn filter-reset"
            onClick={() => {
              setCategory("");
              setMax(150);
              setStockOnly(false);
              setQ("");
              router.replace("/catalog");
            }}
          >
            <X size={14} />
            Limpar filtros
          </button>
        </aside>
        <section>
          <div className="catalog-toolbar">
            <span>{category || "Todos os produtos"}</span>
            <label>
              Ordenar por{" "}
              <select
                aria-label="Ordenar produtos"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="featured">Destaques</option>
                <option value="low">Menor preço</option>
                <option value="high">Maior preço</option>
                <option value="name">Nome A–Z</option>
              </select>
            </label>
          </div>
          {demo.loading ? (
            <Skeletons />
          ) : items.length ? (
            <div className="product-grid catalog-products">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <SearchIcon />
              <h3>Nenhum cuidado encontrado</h3>
              <p>Tente outra busca ou ajuste os filtros.</p>
              <Link className="btn secondary" href="/catalog">
                Ver todos os produtos
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
function SearchIcon() {
  return (
    <span className="empty-icon">
      <Pill size={30} />
    </span>
  );
}
export function ProductDetails({ id }: { id: string }) {
  const demo = useDemo();
  const p = demo.products.find((x) => x.id === id);
  if (demo.loading)
    return (
      <div className="container loading-page">Carregando seu cuidado…</div>
    );
  if (!p)
    return (
      <div className="container empty-state">
        <h1>Produto não encontrado</h1>
        <Link href="/catalog">Voltar ao catálogo</Link>
      </div>
    );
  return (
    <div className="container detail-page">
      <div className="breadcrumbs">
        <Link href="/">Início</Link>
        <span>/</span>
        <Link href="/catalog">Produtos</Link>
        <span>/</span>
        {p.name}
      </div>
      <div className="detail-grid">
        <div className="detail-art">
          <ProductArt color={p.color} shape={p.shape} />
          <span>Imagem ilustrativa · Produto fictício</span>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {p.category.toUpperCase()} · {p.brand.toUpperCase()}
          </span>
          <h1>{p.name}</h1>
          <p className="detail-presentation">{p.presentation}</p>
          <div className="detail-sku">
            Código {p.sku}
            <span>•</span>
            {p.available} unidades disponíveis
          </div>
          {p.originalPrice > p.price && <del>{money(p.originalPrice)}</del>}
          <strong className="detail-price">{money(p.price)}</strong>
          <p className="price-caption">
            Preço demonstrativo, sem cobrança real
          </p>
          {p.requiresReview && (
            <div className="review-notice">
              <ShieldCheck size={21} />
              <span>
                <strong>Revisão de receita simulada</strong>Este pedido precisa
                de aprovação no painel antes do pagamento. Nenhum documento real
                será solicitado.
              </span>
            </div>
          )}
          <button
            className="btn primary full-width"
            disabled={!p.available}
            onClick={() => demo.add(p)}
          >
            <Plus size={18} />
            {p.available
              ? "Adicionar ao carrinho"
              : "Indisponível nesta unidade"}
          </button>
          <div className="detail-delivery">
            <Store size={20} />
            <div>
              <strong>
                Retire na unidade{" "}
                {demo.session?.stores.find((s) => s.id === demo.store)?.name}
              </strong>
              <span>Modalidade de retirada simulada, sem custo</span>
            </div>
          </div>
          <h3>Sobre este cuidado</h3>
          <p className="description">{p.description}</p>
        </div>
      </div>
      <div className="section-heading">
        <h2>Complete seu ritual</h2>
        <Link href="/catalog">
          Ver todos
          <ArrowRight size={15} />
        </Link>
      </div>
      <div className="product-grid">
        {demo.products
          .filter((x) => x.id !== p.id && x.category === p.category)
          .slice(0, 4)
          .map((x) => (
            <ProductCard key={x.id} product={x} />
          ))}
      </div>
    </div>
  );
}
