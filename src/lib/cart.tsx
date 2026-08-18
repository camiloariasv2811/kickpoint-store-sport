import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  size: string;
  color: string | null;
  retailPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number;
  stock: number;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  savings: number;
  addLine: (line: CartLine) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "kickpoint.cart.v1";
const CartContext = createContext<CartContextValue | null>(null);

export function unitPrice(line: CartLine) {
  const totalUnits = line.quantity;
  if (line.wholesalePrice && totalUnits >= line.wholesaleMinQty) return Number(line.wholesalePrice);
  return Number(line.retailPrice);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = lines.reduce((sum, l) => sum + unitPrice(l) * l.quantity, 0);
    const retailTotal = lines.reduce((sum, l) => sum + Number(l.retailPrice) * l.quantity, 0);
    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal,
      savings: Math.max(0, retailTotal - subtotal),
      addLine: (line) =>
        setLines((prev) => {
          const existing = prev.find((l) => l.variantId === line.variantId);
          if (!existing) return [...prev, line];
          return prev.map((l) =>
            l.variantId === line.variantId
              ? { ...l, quantity: Math.min(l.stock, l.quantity + line.quantity) }
              : l,
          );
        }),
      setQuantity: (variantId, quantity) =>
        setLines((prev) =>
          prev
            .map((l) =>
              l.variantId === variantId
                ? { ...l, quantity: Math.max(0, Math.min(l.stock, quantity)) }
                : l,
            )
            .filter((l) => l.quantity > 0),
        ),
      removeLine: (variantId) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
