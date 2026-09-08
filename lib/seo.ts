import type { Metadata } from "next";

const configuredSiteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://sara-masala.vercel.app");
export const SITE_URL = configuredSiteUrl.replace(/\/$/, "");
export const DEFAULT_TITLE = "Sara Masala | Authentic Homemade Spices & Masalas";
export const DEFAULT_DESCRIPTION = "Authentic homemade spice powders, masalas and traditional podis from Sara Masala. Freshly ground, carefully prepared and made with traditional flavours.";
export const BRAND_IMAGE = "/images/sara-masala-og.png";

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: "Sara Masala",
      title: `${title} | Sara Masala`,
      description,
      images: [{ url: BRAND_IMAGE, width: 1200, height: 630, alt: "Sara Masala — Just Like Paati Made It" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Sara Masala`,
      description,
      images: [BRAND_IMAGE],
    },
  };
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
