"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "../lib/products";

export type CartItem = {
  product: Product;
  weight: string;
  quantity: number;
  price: number;
};

type Cart = {
  items: CartItem[];
  add: (product: Product, weight: string, quantity?: number) => void;
  update: (slug: string, weight: string, quantity: number) => void;
  remove: (slug: string, weight: string) => void;
  clear: () => void;
  count: number;
  total: number;
};

type CartNotice = { id: number; message: string };

const CartContext = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<CartNotice | null>(null);

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem("sara-cart") || "[]"));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("sara-cart", JSON.stringify(items));
  }, [items, ready]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const value = useMemo<Cart>(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    total: items.reduce((total, item) => total + item.price * item.quantity, 0),
    add(product, weight, quantity = 1) {
      const price = product.variants.find(variant => variant.weight === weight)?.price || 0;
      setItems(current => {
        const found = current.find(item => item.product.slug === product.slug && item.weight === weight);
        return found
          ? current.map(item => item === found ? { ...item, quantity: item.quantity + quantity } : item)
          : [...current, { product, weight, quantity, price }];
      });
      setNotice({
        id: Date.now(),
        message: `${quantity} × ${product.name} (${weight}) added to your cart`,
      });
    },
    update(slug, weight, quantity) {
      setItems(current => quantity < 1
        ? current.filter(item => !(item.product.slug === slug && item.weight === weight))
        : current.map(item => item.product.slug === slug && item.weight === weight ? { ...item, quantity } : item));
    },
    remove(slug, weight) {
      setItems(current => current.filter(item => !(item.product.slug === slug && item.weight === weight)));
    },
    clear() {
      setItems([]);
    },
  }), [items]);

  return (
    <CartContext.Provider value={value}>
      {children}
      {notice && (
        <div className="cart-toast" role="status" aria-live="polite" key={notice.id}>
          <Check aria-hidden="true" size={18} />
          <span>{notice.message}</span>
          <Link href="/cart">View cart</Link>
        </div>
      )}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
