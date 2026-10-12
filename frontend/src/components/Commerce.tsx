"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  Store,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Package,
  Clock,
  CreditCard,
  X,
} from "lucide-react";
import { useDemo } from "./Provider";
import { ProductArt } from "./Artwork";
import { request } from "@/lib/api";
import { money, date, statusLabels, type Order } from "@/lib/types";
export function Badge({ status }: { status: string }) {
  return (
    <span className={"badge status-" + status}>
      <span />
      {statusLabels[status] || status}
    </span>
  );
}
export function Cart() {
  const demo = useDemo(),
    router = useRouter();
  const [fulfillment, setFulfillment] = useState("pickup"),
    [customer, setCustomer] = useState("Cliente demonstração"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const checkout = useRef<{ signature: string; key: string } | null>(null);
  const items = Object.entries(demo.cart)
    .map(([id, quantity]) => ({
      p: demo.products.find((p) => p.id === id),
      quantity,
    }))
    .filter((x) => x.p !== undefined);
  const subtotal = items.reduce((s, x) => s + x.p!.price * x.quantity, 0),
    shipping = fulfillment === "delivery" && subtotal < 149 ? 9.9 : 0;
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        storeId: demo.store,
        fulfillment,
        customer,
        items: items.map((x) => ({ productId: x.p!.id, quantity: x.quantity })),
      };
      const signature = JSON.stringify(payload);
      if (checkout.current?.signature !== signature)
        checkout.current = { signature, key: crypto.randomUUID() };
      await demo.act<Order>("/orders", {
        ...payload,
        idempotencyKey: checkout.current.key,
      });
      demo.clearCart();
      await demo.refresh();
      router.push("/orders");
      demo.notify("Pedido criado. Continue a simulação em Meus pedidos.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (demo.loading)
    return (
      <div className="container loading-page">Carregando seu carrinho…</div>
    );
  if (!items.length)
    return (
      <div className="container empty-state cart-empty">
        <span className="empty-icon">
          <ShoppingBag size={32} />
        </span>
        <span className="eyebrow">SEU PRÓXIMO CUIDADO</span>
        <h1>O carrinho está esperando por você.</h1>
        <p>Escolha seus favoritos e explore uma compra simulada.</p>
        <Link href="/catalog" className="btn primary">
          Explorar produtos
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  return (
    <div className="container cart-page">
      <div className="breadcrumbs">
        <Link href="/">Início</Link>
        <span>/</span>Carrinho
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAIS UM PASSO PARA O SEU CUIDADO</span>
          <h1>
            Seu carrinho<span className="heading-dot">.</span>
          </h1>
          <p>
            {items.reduce((s, x) => s + x.quantity, 0)} itens selecionados ·
            Unidade{" "}
            {demo.session?.stores.find((s) => s.id === demo.store)?.name}
          </p>
        </div>
        <Link className="text-link" href="/catalog">
          <ArrowLeft size={16} />
          Continuar comprando
        </Link>
      </div>
      <div className="cart-layout">
        <section>
          <div className="cart-items">
            {items.map(({ p, quantity }) => (
              <div className="cart-item" key={p!.id}>
                <div className="cart-art">
                  <ProductArt color={p!.color} shape={p!.shape} />
                </div>
                <div className="cart-item-info">
                  <span className="product-brand">{p!.brand}</span>
                  <Link href={"/product/" + p!.id}>{p!.name}</Link>
                  <p>{p!.presentation}</p>
                  {quantity > p!.available && (
                    <small className="form-error">
                      Estoque atual: {p!.available}. Reduza a quantidade.
                    </small>
                  )}
                </div>
                <div className="quantity-control">
                  <button
                    aria-label={"Diminuir " + p!.name}
                    onClick={() => demo.quantity(p!.id, quantity - 1)}
                    disabled={busy}
                  >
                    <Minus size={13} />
                  </button>
                  <span>{quantity}</span>
                  <button
                    aria-label={"Aumentar " + p!.name}
                    onClick={() => demo.quantity(p!.id, quantity + 1)}
                    disabled={busy || quantity >= p!.available}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <strong>{money(p!.price * quantity)}</strong>
                <button
                  className="icon-btn"
                  aria-label={"Remover " + p!.name}
                  disabled={busy}
                  onClick={() => demo.quantity(p!.id, 0)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="checkout-section">
            <h3>Como quer receber?</h3>
            <div className="fulfillment-options">
              <button
                className={fulfillment === "pickup" ? "selected" : ""}
                onClick={() => setFulfillment("pickup")}
              >
                <Store size={22} />
                <span>
                  <strong>Retirar na farmácia</strong>
                  <small>
                    Sem custo · unidade{" "}
                    {
                      demo.session?.stores.find((s) => s.id === demo.store)
                        ?.name
                    }
                  </small>
                </span>
                <span className="radio-circle" />
              </button>
              <button
                className={fulfillment === "delivery" ? "selected" : ""}
                onClick={() => setFulfillment("delivery")}
              >
                <Truck size={22} />
                <span>
                  <strong>Receber em casa</strong>
                  <small>
                    Entrega simulada · {shipping ? money(shipping) : "grátis"}
                  </small>
                </span>
                <span className="radio-circle" />
              </button>
            </div>
            <label className="field-label">
              Nome fictício para o pedido
              <input
                className="input"
                maxLength={80}
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Cliente demonstração"
              />
            </label>
          </div>
        </section>
        <aside className="order-summary">
          <h3>Resumo do pedido</h3>
          <div>
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div>
            <span>{fulfillment === "pickup" ? "Retirada" : "Entrega"}</span>
            <strong>{shipping ? money(shipping) : "Grátis"}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(subtotal + shipping)}</strong>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn primary full-width"
            onClick={() => void submit()}
            disabled={
              busy ||
              items.some((x) => x.quantity > x.p!.available) ||
              !customer.trim()
            }
          >
            {busy ? "Criando pedido…" : "Criar pedido simulado"}
            <ArrowRight size={16} />
          </button>
          <p className="summary-disclaimer">
            <ShieldCheck size={16} />
            Nenhuma cobrança será realizada. A reserva de estoque dura 20
            minutos.
          </p>
        </aside>
      </div>
    </div>
  );
}
export function Orders() {
  const demo = useDemo();
  const [orders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    if (!demo.session) return;
    try {
      setOrders(await request<Order[]>("/orders"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [demo.session]);
  useEffect(() => {
    void load();
  }, [load]);
  const action = async (o: Order, kind: string) => {
    setBusy(o.id);
    setError("");
    try {
      await demo.act("/orders/" + o.id + "/" + kind, {});
      await load();
      await demo.refresh();
      demo.notify(
        kind === "payment"
          ? "Pagamento simulado confirmado."
          : "Pedido cancelado. Estoque liberado.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="container orders-page">
      <div className="breadcrumbs">
        <Link href="/">Início</Link>
        <span>/</span>Meus pedidos
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CUIDADO EM CADA ETAPA</span>
          <h1>
            Meus pedidos<span className="heading-dot">.</span>
          </h1>
          <p>Acompanhe sua compra, da reserva à conclusão.</p>
        </div>
        <button className="btn secondary" onClick={() => void load()}>
          Atualizar pedidos
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="loading-page">Buscando pedidos…</div>
      ) : !orders.length ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Package size={30} />
          </span>
          <h3>Seu primeiro pedido começa aqui.</h3>
          <p>Faça uma compra e veja como ela chega à nossa gestão.</p>
          <Link href="/catalog" className="btn primary">
            Explorar produtos
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <header>
                <div>
                  <span className="eyebrow">PEDIDO {o.number}</span>
                  <h3>{date(o.createdAt)}</h3>
                </div>
                <Badge status={o.status} />
              </header>
              <div className="order-lines">
                {o.lines.map((l) => (
                  <div key={l.productId}>
                    <span>
                      {l.quantity}× {l.name}
                    </span>
                    <strong>{money(l.quantity * l.unitPrice)}</strong>
                  </div>
                ))}
              </div>
              <div className="order-bottom">
                <span>
                  {o.fulfillment === "pickup" ? (
                    <Store size={17} />
                  ) : (
                    <Truck size={17} />
                  )}{" "}
                  {o.fulfillment === "pickup" ? "Retirada" : "Entrega"} ·{" "}
                  {demo.session?.stores.find((s) => s.id === o.storeId)?.name}
                </span>
                <strong>Total {money(o.total)}</strong>
              </div>
              {o.status === "AwaitingReview" && (
                <div className="order-explanation">
                  <ShieldCheck size={19} />
                  <p>
                    Este pedido aguarda revisão fictícia. Abra{" "}
                    <Link href="/admin/reviews">Análise de receitas</Link> no
                    painel para continuar.
                  </p>
                </div>
              )}
              {o.status === "AwaitingPayment" && (
                <div className="order-explanation">
                  <CreditCard size={19} />
                  <p>
                    A reserva está ativa até{" "}
                    {new Date(o.reservationExpiresAt).toLocaleTimeString(
                      "pt-BR",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                    . Simule o pagamento para continuar.
                  </p>
                </div>
              )}
              {o.status === "Paid" && (
                <div className="order-explanation">
                  <CheckCircle2 size={19} />
                  <p>
                    Pagamento simulado confirmado. Continue a separação e
                    entrega pelo{" "}
                    <Link href="/admin/orders">painel de pedidos</Link>.
                  </p>
                </div>
              )}
              {o.reviewNote && (
                <p className="review-result">Análise: {o.reviewNote}</p>
              )}
              <div className="order-actions">
                {o.status === "AwaitingPayment" && (
                  <button
                    className="btn primary"
                    disabled={busy === o.id}
                    onClick={() => void action(o, "payment")}
                  >
                    Simular pagamento
                    <CreditCard size={16} />
                  </button>
                )}
                {[
                  "AwaitingReview",
                  "AwaitingPayment",
                  "Paid",
                  "Picking",
                ].includes(o.status) && (
                  <button
                    className="btn secondary"
                    disabled={busy === o.id}
                    onClick={() => void action(o, "cancel")}
                  >
                    Cancelar pedido
                    <X size={15} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
