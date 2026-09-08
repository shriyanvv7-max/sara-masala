import type { Metadata } from "next";
import { publicPageMetadata } from "../../lib/seo";

export const metadata: Metadata = publicPageMetadata("Recipes", "Explore traditional recipes and cooking inspiration from the Sara Masala table.", "/recipes");

export default function RecipesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
