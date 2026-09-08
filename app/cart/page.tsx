import type { Metadata } from "next"; import { CartPage } from "../../components/store";
export const metadata: Metadata = { title: "Cart", alternates: { canonical: null }, robots: { index: false, follow: false } };
export default function Cart(){return <CartPage/>}
