import type { Metadata } from "next";
import { publicPageMetadata } from "../../lib/seo";

export const metadata: Metadata = publicPageMetadata("Contact", "Contact Sara Masala for product, order and general enquiries.", "/contact");

export default function ContactLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
