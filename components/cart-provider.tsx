"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "../lib/products";
export type CartItem = { product: Product; weight: string; quantity: number; price: number };
type Cart = { items: CartItem[]; add: (p: Product, weight: string, quantity?: number) => void; update: (slug: string, weight: string, quantity: number) => void; remove: (slug: string, weight: string) => void; clear: () => void; count: number; total: number };
const CartContext = createContext<Cart | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) { const [items, setItems] = useState<CartItem[]>([]); const [ready,setReady]=useState(false);
  useEffect(()=>{setItems(JSON.parse(localStorage.getItem("sara-cart") || "[]"));setReady(true)},[]); useEffect(()=>{if(ready)localStorage.setItem("sara-cart",JSON.stringify(items))},[items,ready]);
  const value = useMemo<Cart>(() => ({ items, count: items.reduce((n,i)=>n+i.quantity,0), total: items.reduce((n,i)=>n+i.price*i.quantity,0), add(p,weight,quantity=1){const price=p.variants.find(v=>v.weight===weight)?.price||0;setItems(old=>{const found=old.find(i=>i.product.slug===p.slug&&i.weight===weight);return found?old.map(i=>i===found?{...i,quantity:i.quantity+quantity}:i):[...old,{product:p,weight,quantity,price}]})}, update(slug,weight,quantity){setItems(old=>quantity<1?old.filter(i=>!(i.product.slug===slug&&i.weight===weight)):old.map(i=>i.product.slug===slug&&i.weight===weight?{...i,quantity}:i))}, remove(slug,weight){setItems(old=>old.filter(i=>!(i.product.slug===slug&&i.weight===weight)))}, clear(){setItems([])}}),[items]); return <CartContext.Provider value={value}>{children}</CartContext.Provider> }
export const useCart=()=>{const context=useContext(CartContext);if(!context)throw new Error("useCart must be used within CartProvider");return context};
