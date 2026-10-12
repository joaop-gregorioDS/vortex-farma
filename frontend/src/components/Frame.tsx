"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ShoppingBag,
  Search,
  MapPin,
  ChevronDown,
  Heart,
  LayoutDashboard,
  Package,
  ClipboardList,
  Boxes,
  ShieldCheck,
  Activity,
  ArrowLeft,
  RotateCcw,
  FlaskConical,
  Menu,
  X,
  Check,
} from "lucide-react";
import { useState } from "react";
import { useDemo } from "./Provider";
import { PageTools } from "./PageTools";
const nav = [
  ["/admin", "Visão geral", LayoutDashboard],
  ["/admin/orders", "Pedidos", ClipboardList],
  ["/admin/stock", "Estoque e lotes", Boxes],
  ["/admin/products", "Produtos", Package],
  ["/admin/reviews", "Análise de receitas", ShieldCheck],
  ["/admin/activity", "Movimentações", Activity],
] as const;
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={"logo " + (small ? "small" : "")}>
      <span className="logo-symbol">
        <span />
        <span />
      </span>
      <span>
        vortex
        <span className="logo-farma">
          farma<span className="logo-dot">.</span>
        </span>
      </span>
    </span>
  );
}
export function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter(),
    demo = useDemo();
  const [search, setSearch] = useState(""),
    [stores, setStores] = useState(false),
    [mobile, setMobile] = useState(false);
  const admin = path.startsWith("/admin");
  const count = Object.values(demo.cart).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="lab-bar">
        <span>
          <FlaskConical size={13} />
          <strong>VORTEX LABS</strong>
          <span className="lab-divider" />
          Uma experiência demonstrativa. Todas as compras são simuladas.
        </span>
        <div className="lab-actions">
          <PageTools />
          <Link href={admin ? "/" : "/admin"}>
            {admin ? "Explorar a loja" : "Acessar gestão"}
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      {admin ? (
        <div className="admin-shell">
          <aside className={"admin-sidebar " + (mobile ? "mobile-open" : "")}>
            <Link href="/" className="logo-link">
              <Logo small />
            </Link>
            <div className="workspace-label">PAINEL DE OPERAÇÕES</div>
            <nav>
              {nav.map(([href, label, Icon]) => (
                <Link
                  onClick={() => setMobile(false)}
                  className={path === href ? "active" : ""}
                  href={href}
                  key={href}
                >
                  <Icon size={19} />
                  {label}
                  {label === "Análise de receitas" && (
                    <span className="nav-mini">DEMO</span>
                  )}
                </Link>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="sandbox-card">
                <span className="live-dot" /> Ambiente demonstrativo
                <p>Seus dados ficam isolados nesta sessão.</p>
              </div>
              <Link href="/">
                <ArrowLeft size={17} />
                Voltar para a farmácia
              </Link>
            </div>
          </aside>
          <div className="admin-body">
            <header className="admin-top">
              <button
                className="icon-btn mobile-menu"
                aria-label="Abrir menu"
                onClick={() => setMobile(!mobile)}
              >
                <Menu size={20} />
              </button>
              <div>
                <span className="breadcrumb-muted">Vortex Labs</span>
                <span className="crumb-slash">/</span>
                <span>Vortex Farma</span>
              </div>
              <div className="admin-top-right">
                <span className="environment">
                  <span className="live-dot" /> Sessão isolada
                </span>
                <button
                  className="text-btn"
                  onClick={() => {
                    if (
                      confirm(
                        "Iniciar uma nova demonstração? Os dados da sessão atual deixarão de aparecer.",
                      )
                    )
                      void demo.reset();
                  }}
                >
                  <RotateCcw size={15} />
                  Reiniciar
                </button>
                <span className="avatar">AD</span>
              </div>
            </header>
            <main className="admin-main">{children}</main>
          </div>
        </div>
      ) : (
        <>
          <header className="store-header">
            <div className="container header-main">
              <Link
                href="/"
                aria-label="Vortex Farma início"
                className="logo-link"
              >
                <Logo />
              </Link>
              <div className="location-wrap">
                <button
                  className="location-button"
                  onClick={() => setStores(!stores)}
                  aria-expanded={stores}
                >
                  <MapPin size={20} />
                  <span>
                    Sua farmácia em
                    <strong>
                      {demo.session?.stores.find((s) => s.id === demo.store)
                        ?.name || "Centro"}{" "}
                      <ChevronDown size={12} />
                    </strong>
                  </span>
                </button>
                {stores && (
                  <div className="store-picker">
                    {demo.session?.stores.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          demo.setStore(s.id);
                          setStores(false);
                        }}
                      >
                        <span>
                          <strong>{s.name}</strong>
                          <small>{s.address}</small>
                        </span>
                        {demo.store === s.id && <Check size={17} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <form
                className="search-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push("/catalog?q=" + encodeURIComponent(search));
                }}
              >
                <Search size={19} />
                <input
                  aria-label="Buscar produtos"
                  placeholder="O que você precisa hoje?"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <kbd>Buscar</kbd>
              </form>
              <Link href="/orders" className="header-account">
                <Heart size={20} />
                <span>
                  Seu cuidado<strong>Meus pedidos</strong>
                </span>
              </Link>
              <Link
                href="/cart"
                className="cart-button"
                aria-label={"Carrinho, " + count + " itens"}
              >
                <ShoppingBag size={21} />
                <span>Carrinho</span>
                {count > 0 && <b>{count}</b>}
              </Link>
            </div>
            <nav className="store-nav container">
              <Link href="/catalog" className="all-categories">
                <Menu size={17} />
                Todas as categorias
              </Link>
              {[
                "Medicamentos",
                "Dermocosméticos",
                "Vitaminas",
                "Higiene",
                "Beleza",
                "Infantil",
              ].map((c) => (
                <Link
                  key={c}
                  href={"/catalog?category=" + encodeURIComponent(c)}
                >
                  {c}
                </Link>
              ))}
              <Link className="offers-link" href="/catalog?offers=true">
                Ofertas da semana
                <ArrowUpRight size={14} />
              </Link>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="store-footer">
            <div className="container footer-main">
              <div>
                <Logo small />
                <p>Cuidado que conecta. Engenharia que transforma.</p>
              </div>
              <div>
                <strong>Um projeto Vortex Labs</strong>
                <p>Farmácia fictícia · Compra e gestão simuladas</p>
                <Link href="/admin">
                  Conheça o painel de gestão <ArrowUpRight size={14} />
                </Link>
              </div>
              <div>
                <span>FEITO PELA</span>
                <strong className="vortex-signature">VORTEX SOFTWARE ↗</strong>
                <p>Porto Alegre · Brasil</p>
              </div>
            </div>
            <div className="container footer-bottom">
              Produtos, preços e unidades fictícios. Não há venda, cobrança ou
              dispensação de medicamentos.
            </div>
          </footer>
        </>
      )}
      {demo.error && (
        <div className="connection-error" role="alert">
          <strong>Não foi possível carregar a demonstração</strong>
          <p>{demo.error}</p>
          <button className="btn primary" onClick={() => void demo.reset()}>
            Tentar novamente
          </button>
        </div>
      )}
    </>
  );
}
