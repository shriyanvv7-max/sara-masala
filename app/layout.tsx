import type { Metadata } from "next";
import "../styles/globals.css";
import "../styles/overrides.css";
import { CartProvider } from "../components/cart-provider";

export const metadata: Metadata = {
  title: "Sara Masala | Just Like Paati Made It",
  description: "Small-batch South Indian spices, freshly ground with tradition.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><CartProvider>{children}</CartProvider></body></html>;
}
