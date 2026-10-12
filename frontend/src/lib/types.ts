export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  presentation: string;
  color: string;
  shape: string;
  price: number;
  originalPrice: number;
  requiresReview: boolean;
  featured: boolean;
  available: number;
};
export type Store = {
  id: string;
  name: string;
  address: string;
  hours: string;
};
export type Session = {
  id: string;
  csrfToken: string;
  expiresAt: string;
  stores: Store[];
  role: string;
};
export type Order = {
  id: string;
  number: string;
  customer: string;
  storeId: string;
  fulfillment: string;
  status: string;
  total: number;
  shipping: number;
  createdAt: string;
  reservationExpiresAt: string;
  reviewNote: string;
  lines: {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
};
export type Lot = {
  id: string;
  productId: string;
  product: string;
  sku: string;
  category: string;
  storeId: string;
  code: string;
  expiry: string;
  onHand: number;
  reserved: number;
  available: number;
  quarantine: boolean;
  status: string;
};
export type Movement = {
  id: string;
  product: string;
  lot: string;
  kind: string;
  quantity: number;
  reason: string;
  actor: string;
  createdAt: string;
};
export type Dashboard = {
  orders: number;
  revenue: number;
  units: number;
  lowStock: number;
  expiring: number;
  pendingReview: number;
  publishedEvents: number;
  processedEvents: number;
  recentOrders: Order[];
  recentMovements: Movement[];
};
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export const date = (value: string) =>
  new Date(
    value.includes("T") ? value : value + "T12:00:00",
  ).toLocaleDateString("pt-BR");
export const statusLabels: Record<string, string> = {
  AwaitingReview: "Em análise",
  AwaitingPayment: "Aguardando pagamento",
  Paid: "Pago",
  Picking: "Em separação",
  Ready: "Pronto para retirada",
  Shipped: "Enviado",
  Completed: "Concluído",
  Cancelled: "Cancelado",
  Expired: "Expirado",
  Rejected: "Rejeitado",
  Healthy: "Disponível",
  Low: "Estoque baixo",
  Expiring: "Validade próxima",
  Quarantine: "Quarentena",
  Receipt: "Recebimento",
  Reservation: "Reserva",
  Release: "Liberação",
  Sale: "Venda",
  Adjustment: "Ajuste",
  Disposal: "Descarte",
};
export const categories = [
  "Medicamentos",
  "Dermocosméticos",
  "Vitaminas",
  "Higiene",
  "Beleza",
  "Infantil",
];
