import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";

const filters = [["Active", "active"], ["Archived", "archived"], ["All", "all"]] as const;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { db } = await requireAdmin();
  const requested = (await searchParams).filter || "active";
  const filter = filters.some(([, value]) => value === requested) ? requested : "active";
  let query = db.from("products").select("id,name,slug,featured,best_seller,archived,categories(name),product_variants(weight,price,stock,active)");
  if (filter === "active") query = query.eq("archived", false);
  if (filter === "archived") query = query.eq("archived", true);
  const { data: products } = await query.order("name");
  return <main className="admin"><p className="eyebrow">CATALOGUE</p><h1>Products</h1><div className="order-admin-tools"><nav aria-label="Product filters">{filters.map(([label, value]) => <Link className={filter === value ? "active" : ""} href={value === "active" ? "/admin/products" : `/admin/products?filter=${value}`} key={value}>{label}</Link>)}</nav><Link className="add-cart admin-button" href="/admin/products/new">Add product</Link></div><div className="admin-table">{products?.length ? products.map((product: any) => <article className={product.archived ? "order-abandoned" : ""} key={product.id}><div><b>{product.name}</b><small>{product.categories?.name} · {product.product_variants?.length || 0} variants</small></div><span>{product.archived ? "Archived" : <>{product.featured ? "Featured" : ""} {product.best_seller ? "Best seller" : ""}</>}</span><Link href={`/admin/products/${product.id}`}>Edit</Link></article>) : <p>No products in this filter.</p>}</div></main>;
}
