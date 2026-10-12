"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Search,
  Download,
  Package,
  ClipboardList,
  Wallet,
  AlertTriangle,
  Clock,
  Check,
  ChevronRight,
  X,
  Box,
  ShieldCheck,
  Activity,
  RefreshCw,
  SlidersHorizontal,
  Pencil,
  Store,
} from "lucide-react";
import { useDemo } from "./Provider";
import { request } from "@/lib/api";
import {
  money,
  date,
  categories,
  statusLabels,
  type Dashboard,
  type Lot,
  type Order,
  type Product,
} from "@/lib/types";
import { Badge } from "./Commerce";
import { ProductArt } from "./Artwork";
type ModalState = {
  kind: "receive" | "adjust" | "product" | "review";
  lot?: Lot;
  product?: Product;
  order?: Order;
} | null;
const headings: Record<string, [string, string]> = {
  dashboard: [
    "Visão geral",
    "Seu cuidado começa com uma operação bem conectada.",
  ],
  stock: [
    "Estoque e lotes",
    "Disponibilidade, validade e rastreabilidade em um só lugar.",
  ],
  orders: ["Pedidos", "Acompanhe cada etapa, da reserva à entrega."],
  products: ["Produtos", "Organize os cuidados disponíveis na sua farmácia."],
  reviews: [
    "Análise de receitas",
    "Explore a revisão fictícia de produtos sujeitos à análise.",
  ],
  activity: ["Movimentações", "O histórico de cada entrada, reserva e saída."],
};
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
          <X size={19} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Admin({ section = "dashboard" }: { section?: string }) {
  const demo = useDemo();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null),
    [lots, setLots] = useState<Lot[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [store, setStore] = useState("all"),
    [modal, setModal] = useState<ModalState>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const current = headings[section] ? section : "dashboard";
  const [title, subtitle] = headings[current];
  const load = useCallback(async () => {
    if (!demo.session) return;
    try {
      const [d, l, o] = await Promise.all([
        request<Dashboard>("/admin/dashboard"),
        request<Lot[]>("/admin/lots"),
        request<Order[]>("/orders"),
      ]);
      setDashboard(d);
      setLots(l);
      setOrders(o);
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
  const run = async (path: string, body: unknown, method = "POST") => {
    setBusy(true);
    setError("");
    try {
      await demo.act(path, body, method);
      await Promise.all([load(), demo.refresh()]);
      setModal(null);
      demo.notify("Operação concluída nesta demonstração.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const exportLots = () => {
    const rows = [
      [
        "Produto",
        "SKU",
        "Unidade",
        "Lote",
        "Validade",
        "Fisico",
        "Reservado",
        "Disponivel",
      ],
      ...lots.map((l) => [
        l.product,
        l.sku,
        l.storeId,
        l.code,
        l.expiry,
        l.onHand,
        l.reserved,
        l.available,
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((c) => '"' + String(c).replaceAll('"', '""') + '"').join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "vortex-farma-estoque.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const selectedLots = lots.filter(
    (l) =>
      (store === "all" || l.storeId === store) &&
      (filter === "all" || l.status === filter) &&
      (!q ||
        (l.product + " " + l.sku + " " + l.code)
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  const selectedOrders = orders.filter(
    (o) =>
      (store === "all" || o.storeId === store) &&
      (filter === "all" || o.status === filter) &&
      (!q ||
        (o.number + " " + o.customer).toLowerCase().includes(q.toLowerCase())),
  );
  const selectedProducts = demo.products.filter(
    (p) =>
      (filter === "all" || p.category === filter) &&
      (!q || (p.name + " " + p.sku).toLowerCase().includes(q.toLowerCase())),
  );
  const orderButtons = (o: Order) => (
    <div className="table-actions">
      {o.status === "AwaitingPayment" && (
        <button
          disabled={busy}
          onClick={() => void run("/orders/" + o.id + "/payment", {})}
        >
          Simular pagamento
          <ArrowRight size={13} />
        </button>
      )}
      {o.status === "AwaitingReview" && (
        <button
          disabled={loading || demo.loading}
          onClick={() => {
            setError("");
            setModal({ kind: "review", order: o });
          }}
        >
          Analisar
          <ChevronRight size={13} />
        </button>
      )}
      {o.status === "Paid" && (
        <button
          disabled={busy}
          onClick={() =>
            void run("/admin/orders/" + o.id + "/status", { status: "Picking" })
          }
        >
          Separar
          <ChevronRight size={13} />
        </button>
      )}
      {o.status === "Picking" && (
        <button
          disabled={busy}
          onClick={() =>
            void run("/admin/orders/" + o.id + "/status", {
              status: o.fulfillment === "pickup" ? "Ready" : "Shipped",
            })
          }
        >
          {o.fulfillment === "pickup" ? "Liberar retirada" : "Enviar"}
          <ChevronRight size={13} />
        </button>
      )}
      {["Ready", "Shipped"].includes(o.status) && (
        <button
          disabled={busy}
          onClick={() =>
            void run("/admin/orders/" + o.id + "/status", {
              status: "Completed",
            })
          }
        >
          Concluir
          <Check size={13} />
        </button>
      )}
      {["AwaitingReview", "AwaitingPayment", "Paid", "Picking"].includes(
        o.status,
      ) && (
        <button
          className="cancel-action"
          disabled={busy}
          onClick={() => void run("/orders/" + o.id + "/cancel", {})}
        >
          Cancelar
        </button>
      )}
    </div>
  );
  const orderTable = (data: Order[]) =>
    data.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Pedido / cliente</th>
              <th>Unidade</th>
              <th>Modalidade</th>
              <th>Total</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {data.map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.number}</strong>
                  <small>
                    {o.customer} · {date(o.createdAt)}
                  </small>
                  <div className="order-table-lines">
                    {o.lines.map((l) => `${l.quantity}× ${l.name}`).join(" · ")}
                  </div>
                </td>
                <td>
                  {demo.session?.stores.find((s) => s.id === o.storeId)?.name}
                </td>
                <td>{o.fulfillment === "pickup" ? "Retirada" : "Entrega"}</td>
                <td className="numeric">{money(o.total)}</td>
                <td>
                  <Badge status={o.status} />
                </td>
                <td>{orderButtons(o)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="panel-empty">
        <ClipboardList size={27} />
        <h3>Ainda não há pedidos por aqui.</h3>
        <p>Faça uma compra simulada para acompanhar a operação.</p>
        <Link href="/catalog">
          Explorar a loja
          <ArrowUpRight size={14} />
        </Link>
      </div>
    );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">
            <span className="live-dot" /> OPERAÇÃO DEMONSTRATIVA
          </div>
          <h1>
            {title}
            <span className="heading-dot">.</span>
          </h1>
          <p>{subtitle}</p>
        </div>
        <div className="heading-actions">
          <button
            className="btn secondary"
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw size={15} />
            Atualizar
          </button>
          {current === "stock" ? (
            <button
              className="btn primary"
              disabled={loading || demo.loading}
              onClick={() => {
                setError("");
                setModal({ kind: "receive" });
              }}
            >
              <Plus size={16} />
              Receber estoque
            </button>
          ) : current === "products" ? (
            <button
              className="btn primary"
              disabled={loading || demo.loading}
              onClick={() => {
                setError("");
                setModal({ kind: "product" });
              }}
            >
              <Plus size={16} />
              Novo produto
            </button>
          ) : (
            <Link href="/" className="btn primary">
              Explorar a loja
              <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </div>
      {error && !modal && (
        <div className="form-error error-box" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="loading-page">Carregando a operação…</div>
      ) : (
        <>
          {current === "dashboard" && dashboard && (
            <>
              <div className="metrics-grid">
                <Metric
                  icon={ClipboardList}
                  label="Pedidos nesta sessão"
                  value={String(dashboard.orders)}
                  caption="Todas as etapas da compra"
                />
                <Metric
                  icon={Wallet}
                  label="Vendas simuladas"
                  value={money(dashboard.revenue)}
                  caption="Pedidos pagos e não cancelados"
                />
                <Metric
                  icon={Package}
                  label="Unidades disponíveis"
                  value={String(dashboard.units)}
                  caption="Saldo vendável nas 3 unidades"
                />
                <Metric
                  icon={AlertTriangle}
                  label="Atenção ao estoque"
                  value={String(dashboard.lowStock)}
                  caption="Produtos por unidade com saldo < 5"
                  warning
                />
              </div>
              <div className="dashboard-middle">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Disponibilidade por categoria</h2>
                      <p>Saldo vendável em todas as unidades</p>
                    </div>
                    <span className="subtle-tag">ESTOQUE ATUAL</span>
                  </div>
                  <div className="inventory-chart">
                    {categories.map((c, i) => {
                      const value = lots
                        .filter((l) => l.category === c)
                        .reduce((s, l) => s + l.available, 0);
                      const max = Math.max(
                        1,
                        ...categories.map((c) =>
                          lots
                            .filter((l) => l.category === c)
                            .reduce((s, l) => s + l.available, 0),
                        ),
                      );
                      return (
                        <div className="chart-column" key={c}>
                          <strong>{value}</strong>
                          <div className="chart-track">
                            <div
                              style={{
                                height: (value / max) * 100 + "%",
                                opacity: 0.45 + i * 0.09,
                              }}
                            />
                          </div>
                          <span>{c === "Dermocosméticos" ? "Dermos" : c}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chart-legend">
                    <span />
                    Dados da sua sessão demonstrativa
                  </div>
                </section>
                <section className="panel attention-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Precisam da sua atenção</h2>
                      <p>Prioridades para uma operação saudável</p>
                    </div>
                    <span className="attention-icon">
                      <AlertTriangle size={18} />
                    </span>
                  </div>
                  <Link href="/admin/stock">
                    <span className="attention-item-icon amber">
                      <Clock size={19} />
                    </span>
                    <span>
                      <strong>
                        {dashboard.expiring} lotes com validade próxima
                      </strong>
                      <small>Vencimento nos próximos 30 dias</small>
                    </span>
                    <ChevronRight size={17} />
                  </Link>
                  <Link href="/admin/stock">
                    <span className="attention-item-icon rose">
                      <Package size={19} />
                    </span>
                    <span>
                      <strong>
                        {dashboard.lowStock} saldos de estoque baixo
                      </strong>
                      <small>Verifique a reposição por unidade</small>
                    </span>
                    <ChevronRight size={17} />
                  </Link>
                  <Link href="/admin/reviews">
                    <span className="attention-item-icon violet">
                      <ShieldCheck size={19} />
                    </span>
                    <span>
                      <strong>
                        {dashboard.pendingReview} receitas para analisar
                      </strong>
                      <small>Revisão fictícia antes do pagamento</small>
                    </span>
                    <ChevronRight size={17} />
                  </Link>
                  <div className="event-strip">
                    <span className="live-dot" />
                    <span>
                      {dashboard.processedEvents} eventos processados ·{" "}
                      {dashboard.publishedEvents} publicados
                    </span>
                  </div>
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Últimos pedidos</h2>
                    <p>Da experiência de compra à operação</p>
                  </div>
                  <Link href="/admin/orders">
                    Ver todos
                    <ArrowRight size={14} />
                  </Link>
                </div>
                {orderTable(dashboard.recentOrders)}
              </section>
              <div className="admin-footnote">
                <ShieldCheck size={15} />
                Ambiente isolado. Os dados exibidos pertencem apenas à sua
                sessão.
              </div>
            </>
          )}
          {current === "stock" && (
            <>
              <div className="stock-summary">
                <span>
                  <strong>{lots.length}</strong> lotes cadastrados
                </span>
                <span>
                  <strong>{lots.reduce((s, l) => s + l.reserved, 0)}</strong>{" "}
                  unidades reservadas
                </span>
                <span className="amber-text">
                  <strong>
                    {lots.filter((l) => l.status === "Expired").length}
                  </strong>{" "}
                  lotes vencidos e bloqueados
                </span>
                <button className="text-btn" onClick={exportLots}>
                  <Download size={15} />
                  Exportar CSV
                </button>
              </div>
              <section className="panel">
                <div className="table-toolbar">
                  <SearchField
                    value={q}
                    onChange={setQ}
                    placeholder="Buscar produto, SKU ou lote"
                  />
                  <select
                    aria-label="Filtrar unidade"
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                  >
                    <option value="all">Todas as unidades</option>
                    {demo.session?.stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filtrar estoque"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Todos os status</option>
                    {[
                      "Healthy",
                      "Low",
                      "Expiring",
                      "Expired",
                      "Quarantine",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Unidade / lote</th>
                        <th>Validade</th>
                        <th>Físico</th>
                        <th>Reservado</th>
                        <th>Disponível</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLots.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <div className="table-product">
                              <span className="table-product-icon">
                                <Package size={17} />
                              </span>
                              <div>
                                <strong>{l.product}</strong>
                                <small>{l.sku}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            {
                              demo.session?.stores.find(
                                (s) => s.id === l.storeId,
                              )?.name
                            }
                            <small>{l.code}</small>
                          </td>
                          <td>{date(l.expiry)}</td>
                          <td className="numeric">{l.onHand}</td>
                          <td className="numeric">{l.reserved}</td>
                          <td className="numeric">
                            <strong>{l.available}</strong>
                          </td>
                          <td>
                            <Badge status={l.status} />
                          </td>
                          <td>
                            <button
                              className="table-edit"
                              aria-label={
                                "Ajustar lote " + l.code + " " + l.storeId
                              }
                              disabled={loading || demo.loading}
                              onClick={() => {
                                setError("");
                                setModal({ kind: "adjust", lot: l });
                              }}
                            >
                              <SlidersHorizontal size={15} />
                              Ajustar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!selectedLots.length && (
                    <div className="panel-empty">
                      Nenhum lote encontrado com estes filtros.
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  {selectedLots.length} lotes · Estoque disponível considera
                  validade, quarentena e reservas.
                </div>
              </section>
            </>
          )}
          {current === "orders" && (
            <section className="panel">
              <div className="table-toolbar">
                <SearchField
                  value={q}
                  onChange={setQ}
                  placeholder="Buscar pedido ou cliente"
                />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  aria-label="Filtrar status de pedido"
                >
                  <option value="all">Todos os status</option>
                  {[
                    "AwaitingReview",
                    "AwaitingPayment",
                    "Paid",
                    "Picking",
                    "Ready",
                    "Shipped",
                    "Completed",
                    "Cancelled",
                    "Expired",
                    "Rejected",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
              {orderTable(selectedOrders)}
            </section>
          )}
          {current === "products" && (
            <section className="panel">
              <div className="table-toolbar">
                <SearchField
                  value={q}
                  onChange={setQ}
                  placeholder="Buscar nome ou SKU"
                />
                <select
                  aria-label="Filtrar categoria"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Categoria</th>
                      <th>Preço</th>
                      <th>Revisão fictícia</th>
                      <th>Disponível na loja</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-product">
                            <span className="mini-art">
                              <ProductArt shape={p.shape} color={p.color} />
                            </span>
                            <div>
                              <strong>{p.name}</strong>
                              <small>
                                {p.sku} · {p.presentation}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{p.category}</td>
                        <td className="numeric">{money(p.price)}</td>
                        <td>
                          {p.requiresReview ? (
                            <span className="subtle-tag">Obrigatória</span>
                          ) : (
                            "Dispensada"
                          )}
                        </td>
                        <td className="numeric">{p.available}</td>
                        <td>
                          <button
                            className="table-edit"
                            disabled={loading || demo.loading}
                            onClick={() => {
                              setError("");
                              setModal({ kind: "product", product: p });
                            }}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                {selectedProducts.length} produtos · Disponibilidade na unidade{" "}
                {demo.session?.stores.find((s) => s.id === demo.store)?.name}
              </div>
            </section>
          )}
          {current === "reviews" && (
            <>
              <div className="review-notice admin-review-notice">
                <ShieldCheck size={23} />
                <span>
                  <strong>Uma simulação de regra operacional</strong>Nenhum
                  documento real é recebido. A aprovação representa apenas uma
                  etapa fictícia do pedido.
                </span>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Aguardando análise</h2>
                    <p>
                      {
                        orders.filter((o) => o.status === "AwaitingReview")
                          .length
                      }{" "}
                      pedidos pendentes
                    </p>
                  </div>
                </div>
                {orderTable(
                  orders.filter((o) => o.status === "AwaitingReview"),
                )}
              </section>
              <section className="panel review-history">
                <div className="panel-heading">
                  <h2>Histórico de análises</h2>
                </div>
                {orderTable(orders.filter((o) => o.reviewNote))}
              </section>
            </>
          )}
          {current === "activity" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Movimentações recentes</h2>
                  <p>As 12 operações mais recentes da sua sessão</p>
                </div>
                <span className="subtle-tag">TRILHA DE AUDITORIA</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Data / hora</th>
                      <th>Produto / lote</th>
                      <th>Operação</th>
                      <th>Quantidade</th>
                      <th>Motivo</th>
                      <th>Responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard?.recentMovements.map((m) => (
                      <tr key={m.id}>
                        <td>
                          {date(m.createdAt)}
                          <small>
                            {new Date(m.createdAt).toLocaleTimeString("pt-BR")}
                          </small>
                        </td>
                        <td>
                          <strong>{m.product}</strong>
                          <small>{m.lot}</small>
                        </td>
                        <td>
                          <Badge status={m.kind} />
                        </td>
                        <td className="numeric">
                          {m.quantity > 0 ? "+" : ""}
                          {m.quantity}
                        </td>
                        <td>{m.reason}</td>
                        <td>{m.actor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
      {modal && (
        <Modal
          title={
            modal.kind === "receive"
              ? "Receber estoque"
              : modal.kind === "adjust"
                ? "Ajustar estoque"
                : modal.kind === "review"
                  ? "Analisar receita fictícia"
                  : modal.product
                    ? "Editar produto"
                    : "Novo produto"
          }
          onClose={() => {
            if (!busy) {
              setModal(null);
              setError("");
            }
          }}
        >
          <AdminForm
            modal={modal}
            products={demo.products}
            stores={demo.session?.stores || []}
            busy={busy}
            error={error}
            run={run}
          />
        </Modal>
      )}
    </>
  );
}
function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="table-search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  caption,
  warning = false,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  caption: string;
  warning?: boolean;
}) {
  return (
    <article className={"metric " + (warning ? "warning" : "")}>
      <div>
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={18} />
        </span>
      </div>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  );
}
function AdminForm({
  modal,
  products,
  stores,
  busy,
  error,
  run,
}: {
  modal: NonNullable<ModalState>;
  products: Product[];
  stores: { id: string; name: string }[];
  busy: boolean;
  error: string;
  run: (path: string, body: unknown, method?: string) => Promise<boolean>;
}) {
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (key: string) => String(f.get(key) || "");
    if (modal.kind === "adjust")
      await run("/admin/lots/" + modal.lot!.id + "/adjust", {
        quantity: Number(get("quantity")),
        reason: get("reason"),
      });
    if (modal.kind === "receive")
      await run("/admin/lots/receive", {
        productId: get("productId"),
        storeId: get("storeId"),
        code: get("code"),
        expiry: get("expiry"),
        quantity: Number(get("quantity")),
      });
    if (modal.kind === "product")
      await run(
        "/admin/products" + (modal.product ? "/" + modal.product.id : ""),
        {
          name: get("name"),
          brand: get("brand"),
          category: get("category"),
          presentation: get("presentation"),
          description: get("description"),
          price: Number(get("price")),
          requiresReview: f.get("requiresReview") === "on",
        },
        modal.product ? "PUT" : "POST",
      );
    if (modal.kind === "review")
      await run("/admin/orders/" + modal.order!.id + "/review", {
        approved: get("approved") === "true",
        reason: get("reason"),
      });
  };
  return (
    <form onSubmit={(e) => void submit(e)} className="modal-form">
      {modal.kind === "adjust" && (
        <>
          <p className="modal-description">
            {modal.lot!.product} · {modal.lot!.code}
            <br />
            Físico: {modal.lot!.onHand} · Reservado: {modal.lot!.reserved}
          </p>
          <label className="field-label">
            Variação de quantidade
            <input
              name="quantity"
              className="input"
              type="number"
              required
              min="-10000"
              max="10000"
              step="1"
              defaultValue="1"
            />
          </label>
          <small>
            Use um valor positivo para entrada ou negativo para saída.
          </small>
          <label className="field-label">
            Justificativa
            <textarea
              name="reason"
              className="input"
              required
              maxLength={300}
              placeholder="Ex.: Correção após conferência do lote"
            />
          </label>
        </>
      )}
      {modal.kind === "receive" && (
        <>
          <label className="field-label">
            Produto
            <select name="productId" className="input" required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Unidade
            <select name="storeId" className="input">
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label className="field-label">
              Código do lote
              <input
                name="code"
                className="input"
                required
                maxLength={40}
                placeholder="VF26-NOVO"
              />
            </label>
            <label className="field-label">
              Quantidade
              <input
                name="quantity"
                className="input"
                type="number"
                required
                min="1"
                max="10000"
                step="1"
                defaultValue="10"
              />
            </label>
          </div>
          <label className="field-label">
            Validade
            <input name="expiry" className="input" type="date" required />
          </label>
        </>
      )}
      {modal.kind === "product" && (
        <>
          <label className="field-label">
            Nome
            <input
              name="name"
              className="input"
              required
              maxLength={100}
              defaultValue={modal.product?.name}
            />
          </label>
          <div className="form-grid">
            <label className="field-label">
              Marca
              <input
                name="brand"
                className="input"
                required
                maxLength={60}
                defaultValue={modal.product?.brand || "Vortex Care"}
              />
            </label>
            <label className="field-label">
              Categoria
              <select
                name="category"
                className="input"
                defaultValue={modal.product?.category || "Beleza"}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label className="field-label">
              Apresentação
              <input
                name="presentation"
                className="input"
                maxLength={100}
                defaultValue={modal.product?.presentation}
              />
            </label>
            <label className="field-label">
              Preço (R$)
              <input
                name="price"
                className="input"
                type="number"
                required
                min="0.01"
                max="100000"
                step="0.01"
                defaultValue={modal.product?.price || 19.9}
              />
            </label>
          </div>
          <label className="field-label">
            Descrição
            <textarea
              name="description"
              className="input"
              maxLength={1000}
              defaultValue={
                modal.product?.description ||
                "Produto fictício para demonstração."
              }
            />
          </label>
          <label className="check-label">
            <input
              name="requiresReview"
              type="checkbox"
              defaultChecked={modal.product?.requiresReview}
            />
            Exige revisão de receita fictícia
          </label>
        </>
      )}
      {modal.kind === "review" && (
        <>
          <p className="modal-description">
            Pedido {modal.order!.number} · {modal.order!.customer}
          </p>
          <div className="review-notice">
            <ShieldCheck size={20} />
            <span>
              Documento fictício pré-definido. Esta análise não tem validade
              sanitária.
            </span>
          </div>
          <label className="field-label">
            Decisão
            <select name="approved" className="input">
              <option value="true">Aprovar a simulação</option>
              <option value="false">Rejeitar a simulação</option>
            </select>
          </label>
          <label className="field-label">
            Justificativa
            <textarea
              name="reason"
              className="input"
              required
              maxLength={300}
              defaultValue="Conferência fictícia concluída na demonstração."
            />
          </label>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary full-width" disabled={busy} type="submit">
        {busy ? "Salvando…" : "Confirmar operação"}
        <Check size={16} />
      </button>
    </form>
  );
}
