import type { Metadata } from "next";
import "../styles/globals.css";
import "../styles/overrides.css";
import { CartProvider } from "../components/cart-provider";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL, safeJsonLd } from "../lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: "%s | Sara Masala" },
  description: DEFAULT_DESCRIPTION,
  applicationName: "Sara Masala",
  keywords: ["Sara Masala", "homemade spices", "masala powders", "traditional podi", "South Indian spices", "spice powders"],
  authors: [{ name: "Sara Masala", url: SITE_URL }],
  creator: "Sara Masala",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Sara Masala",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: "/images/sara-masala-og.png", width: 1200, height: 630, alt: "Sara Masala — Just Like Paati Made It" }],
  },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, images: ["/images/sara-masala-og.png"] },
  icons: {
    icon: [{ url: "/images/sara-masala-icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/images/sara-masala-icon.png",
    apple: [{ url: "/images/sara-masala-icon.png", type: "image/png", sizes: "512x512" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = [
    { "@context": "https://schema.org", "@type": "Organization", name: "Sara Masala", url: SITE_URL, logo: `${SITE_URL}/images/sara-masala-logo-transparent.png`, sameAs: ["https://www.instagram.com/sara.masala_co/"] },
    { "@context": "https://schema.org", "@type": "WebSite", name: "Sara Masala", url: SITE_URL, description: DEFAULT_DESCRIPTION, publisher: { "@type": "Organization", name: "Sara Masala" } },
  ];
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} /><CartProvider>{children}</CartProvider></body></html>;
}
