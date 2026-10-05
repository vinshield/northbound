"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLine } from "@/lib/types";

const STORAGE_KEY = "northbound.cart.v1";

type CartContextValue = {
  lines: CartLine[];
  /** False until localStorage has been read, so the UI can avoid flashing an empty cart. */
  ready: boolean;
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop anything that doesn't look like a cart line, so an old or corrupt
    // payload can never crash the app on load.
    return parsed.filter(
      (line): line is CartLine =>
        typeof line === "object" &&
        line !== null &&
        typeof (line as CartLine).variantId === "string" &&
        typeof (line as CartLine).quantity === "number",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(readStoredCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Private browsing or a full quota - the cart just won't persist.
    }
  }, [lines, ready]);

  // Keep tabs in sync so adding from one window updates the badge in another.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setLines(readStoredCart());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback<CartContextValue["add"]>((line, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.variantId === line.variantId);
      if (existing) {
        const capped = Math.min(existing.quantity + quantity, line.maxStock);
        return current.map((l) =>
          l.variantId === line.variantId ? { ...l, ...line, quantity: capped } : l,
        );
      }
      return [...current, { ...line, quantity: Math.min(quantity, line.maxStock) }];
    });
  }, []);

  const setQuantity = useCallback<CartContextValue["setQuantity"]>((variantId, quantity) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => l.variantId !== variantId)
        : current.map((l) =>
            l.variantId === variantId
              ? { ...l, quantity: Math.min(quantity, Math.max(l.maxStock, 1)) }
              : l,
          ),
    );
  }, []);

  const remove = useCallback<CartContextValue["remove"]>((variantId) => {
    setLines((current) => current.filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    return {
      lines,
      ready,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, ready, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
