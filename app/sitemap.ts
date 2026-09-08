import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";
import { getProducts } from "../lib/products";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    { path: "", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/shop", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/recipes", changeFrequency: "weekly" as const, priority: 0.7 },
  ];
  let productSlugs: string[] = [];
  try {
    productSlugs = (await getProducts()).filter(product => product.variants.length > 0).map(product => product.slug);
  } catch (error) {
    console.error("[sitemap] Product URLs could not be loaded; returning the static storefront sitemap.", error instanceof Error ? error.message : "Unknown error");
  }
  return [
    ...pages.map(page => ({ url: `${SITE_URL}${page.path}`, changeFrequency: page.changeFrequency, priority: page.priority })),
    ...productSlugs.map(slug => ({ url: `${SITE_URL}/product/${encodeURIComponent(slug)}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
