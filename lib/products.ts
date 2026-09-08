import "server-only";
import { unstable_cache } from "next/cache";
import { supabasePublic } from "./supabase/public";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

export interface ProductVariant {
  id: string;
  weight: string;
  price: number;
  mrp: number;
  stock: number;
  sku: string;
  active: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  ingredients: string;
  storage: string;
  featured: boolean;
  best_seller: boolean;
  archived: boolean;
  image: string | null;
  category: Category;
  variants: ProductVariant[];
  color: string;
}

const colors = ["#E8A317", "#8B5E3C", "#B33939", "#C44A3D", "#A66B3D", "#593B2B", "#93422E"];
const productSelect = "*, categories(id,name,slug,image), product_variants(*)";

function mapProduct(row: any, index = 0): Product {
  const variants = (row.product_variants || [])
    .filter((variant: ProductVariant) => variant.active)
    .map((variant: any) => ({
      ...variant,
      price: Number(variant.price),
      // Keep reads compatible while migration 005 is being deployed.
      mrp: Number(variant.mrp ?? variant.price),
      stock: Number(variant.stock),
    }))
    .sort((left: ProductVariant, right: ProductVariant) =>
      Number.parseFloat(left.weight) - Number.parseFloat(right.weight)
    );

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    ingredients: row.ingredients,
    storage: row.storage,
    featured: row.featured,
    best_seller: row.best_seller,
    archived: row.archived,
    image: row.image,
    category: row.categories,
    variants,
    color: colors[index % colors.length],
  };
}

const loadProducts = unstable_cache(async () => {
  const db = supabasePublic();
  const { data, error } = await db.from("products").select(productSelect).eq("archived", false).order("name");
  if (error) {
    console.error("Failed to load products:", error.code, error.message);
    throw new Error("Unable to load products.");
  }
  return (data || []).map(mapProduct);
}, ["public-product-catalog-v1"], { revalidate: 300, tags: ["product-catalog"] });

export async function getProducts() { return loadProducts(); }

export async function getProduct(slug: string) {
  return (await loadProducts()).find(product => product.slug === slug) || null;
}

export async function getFeaturedProducts() {
  return (await loadProducts()).filter(product => product.featured).slice(0, 4);
}

export async function getRelatedProducts(categoryId: string, excludeId: string) {
  return (await loadProducts()).filter(product => product.category.id === categoryId && product.id !== excludeId).slice(0, 4);
}
