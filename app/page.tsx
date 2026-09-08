import type { Metadata } from "next";
import { HomePage } from "../components/home/home-page";
import { getFeaturedProducts } from "../lib/products";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "../lib/seo";

export const metadata: Metadata = {
  title: { absolute: DEFAULT_TITLE },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
};

// Render against the cached catalogue at request time. This keeps deployments
// independent of Supabase availability while getFeaturedProducts retains ISR.
export const dynamic = "force-dynamic";

export default async function Page() { return <HomePage featuredProducts={await getFeaturedProducts()} />; }
