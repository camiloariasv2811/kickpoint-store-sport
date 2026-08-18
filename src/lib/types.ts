export type Variant = {
  id: string;
  product_id: string;
  size: string;
  color: string | null;
  sku: string | null;
  stock: number;
  active: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_sku: string | null;
  retail_price: number;
  wholesale_price: number | null;
  wholesale_min_qty: number;
  images: string[];
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_offer: boolean;
  active: boolean;
  low_stock_threshold: number;
  created_at: string;
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string } | null;
  variants: Variant[];
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
};

export type Brand = { id: string; name: string; slug: string };

export const ORDER_STATUSES = [
  "pedido_recibido",
  "pago_pendiente",
  "pago_verificado",
  "preparando_pedido",
  "empacando_pedido",
  "pedido_enviado",
  "pedido_entregado",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pedido_recibido: "Pedido recibido",
  pago_pendiente: "Pago pendiente",
  pago_verificado: "Pago verificado",
  preparando_pedido: "Preparando pedido",
  empacando_pedido: "Empacando pedido",
  pedido_enviado: "Pedido enviado",
  pedido_entregado: "Pedido entregado",
};

export function totalStock(p: Pick<Product, "variants">) {
  return p.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
}
