import type { Metadata } from "next";
import { HomePage } from "../components/home/home-page";
import { getFeaturedProducts } from "../lib/products";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "../lib/seo";

export const metadata: Metadata = {
  title: { absolute: DEFAULT_TITLE },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default async function Page() { return <HomePage featuredProducts={await getFeaturedProducts()} />; }
