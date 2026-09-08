import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "../../../lib/supabase/server";
import { productSchema, variantSchema } from "../../../lib/validations";
import { revalidateProductCatalog } from "../../../lib/catalog-cache";
import { rateLimit } from "../../../lib/rate-limit";

const createProductSchema = z.object({ product: productSchema, variants: z.array(variantSchema).min(1).max(100) }).strict();

export async function GET() {
  const db = await createClient();
  const { data, error } = await db.from("products").select("*, categories(*), product_variants(*)").order("created_at", { ascending: false });
  if (error) { console.error("[products:list] Query failed", { code: error.code }); return NextResponse.json({ error: "Unable to load products." }, { status: 500 }); }
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user || user.app_metadata.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimit(request, { bucket: "admin-product-write", limit: 120, windowSeconds: 3600, identity: user.id });
  if (limited) return limited;
  const parsed = createProductSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the product details and variants." }, { status: 400 });
  const { data, error } = await db.from("products").insert(parsed.data.product).select().single();
  if (error || !data) { console.error("[products:create] Insert failed", { code: error?.code }); return NextResponse.json({ error: "Unable to create product." }, { status: 500 }); }
  const { error: variantError } = await db.from("product_variants").insert(parsed.data.variants.map(variant => ({ ...variant, product_id: data.id })));
  if (variantError) {
    await db.from("products").delete().eq("id", data.id);
    console.error("[products:create] Variant insert failed", { code: variantError.code });
    return NextResponse.json({ error: "Unable to create product variants." }, { status: 500 });
  }
  revalidateProductCatalog();
  return NextResponse.json(data, { status: 201 });
}
