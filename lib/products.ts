import "server-only";
import { createClient } from "./supabase/server";

export interface Category { id: string; name: string; slug: string; image: string | null }
export interface ProductVariant { id: string; weight: string; price: number; stock: number; sku: string; active: boolean }
export interface Product { id: string; slug: string; name: string; description: string; ingredients: string; storage: string; featured: boolean; best_seller: boolean; image: string | null; category: Category; variants: ProductVariant[]; color: string }

const colors = ["#E8A317", "#8B5E3C", "#B33939", "#C44A3D", "#A66B3D", "#593B2B", "#93422E"];
function mapProduct(row: any, index = 0): Product { return { id: row.id, slug: row.slug, name: row.name, description: row.description, ingredients: row.ingredients, storage: row.storage, featured: row.featured, best_seller: row.best_seller, image: row.image, category: row.categories, variants: (row.product_variants || []).filter((variant: ProductVariant) => variant.active), color: colors[index % colors.length] }; }
export async function getProducts() { const db=await createClient(); const {data,error}=await db.from("products").select("*, categories(id,name,slug,image), product_variants(id,weight,price,stock,sku,active)").order("name"); if(error) throw new Error("Unable to load products."); return (data||[]).map(mapProduct); }
export async function getProduct(slug: string) { const db=await createClient(); const {data,error}=await db.from("products").select("*, categories(id,name,slug,image), product_variants(id,weight,price,stock,sku,active)").eq("slug",slug).single(); if(error||!data) return null; return mapProduct(data); }
export async function getFeaturedProducts() { const db=await createClient(); const {data,error}=await db.from("products").select("*, categories(id,name,slug,image), product_variants(id,weight,price,stock,sku,active)").eq("featured",true).limit(4); if(error) throw new Error("Unable to load featured products."); return (data||[]).map(mapProduct); }
export async function getRelatedProducts(categoryId: string, excludeId: string) { const db=await createClient(); const {data,error}=await db.from("products").select("*, categories(id,name,slug,image), product_variants(id,weight,price,stock,sku,active)").eq("category_id",categoryId).neq("id",excludeId).limit(4); if(error) return []; return (data||[]).map(mapProduct); }
