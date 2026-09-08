import type { Metadata } from "next";
import { StoreNav } from "../../components/store";
import { CheckoutForm } from "../../components/checkout/checkout-form";
export const metadata: Metadata = { title: "Checkout", alternates: { canonical: null }, robots: { index: false, follow: false } };
export default function Checkout(){return <><StoreNav/><main className="form-page"><p className="eyebrow">CHECKOUT</p><h1>Almost at your table.</h1><CheckoutForm/></main></>}
