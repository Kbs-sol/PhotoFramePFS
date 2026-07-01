// Client-side cart — persisted to localStorage, exposed via React context.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  variantId: string;
  slug: string;
  name: string;
  image: string;
  size: string; // size CODE (XS/S/M/L)
  frame: string;
  price: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: CartItem) => void;
  remove: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "chitraframe.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore */ }
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const add = (item: CartItem) =>
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.variantId === item.variantId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: Math.min(20, next[idx].quantity + item.quantity) };
          return next;
        }
        return [...prev, item];
      });
    const remove = (variantId: string) =>
      setItems((prev) => prev.filter((p) => p.variantId !== variantId));
    const setQty = (variantId: string, qty: number) =>
      setItems((prev) =>
        prev.map((p) => (p.variantId === variantId ? { ...p, quantity: Math.max(1, Math.min(20, qty)) } : p)),
      );
    const clear = () => setItems([]);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return { items, count, subtotal, add, remove, setQty, clear, isOpen, setOpen };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
