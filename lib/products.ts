import "server-only";
import { createClient } from "./supabase/server";

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
    image: row.image,
    category: row.categories,
    variants,
    color: colors[index % colors.length],
  };
}

export async function getProducts() {
  const db = await createClient();
  const { data, error } = await db.from("products").select(productSelect).order("name");
  if (error) {
    console.error("Failed to load products:", error.code, error.message);
    throw new Error("Unable to load products.");
  }
  return (data || []).map(mapProduct);
}

export async function getProduct(slug: string) {
  const db = await createClient();
  const { data, error } = await db.from("products").select(productSelect).eq("slug", slug).single();
  if (error || !data) return null;
  return mapProduct(data);
}

export async function getFeaturedProducts() {
  const db = await createClient();
  const { data, error } = await db.from("products").select(productSelect).eq("featured", true).limit(4);
  if (error) {
    console.error("Failed to load featured products:", error.code, error.message);
    throw new Error("Unable to load featured products.");
  }
  return (data || []).map(mapProduct);
}

export async function getRelatedProducts(categoryId: string, excludeId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("products")
    .select(productSelect)
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .limit(4);
  if (error) return [];
  return (data || []).map(mapProduct);
}
