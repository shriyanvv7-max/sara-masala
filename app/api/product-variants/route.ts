import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "../../../lib/supabase/server";
import { variantSchema } from "../../../lib/validations";
import { revalidateProductCatalog } from "../../../lib/catalog-cache";
import { rateLimit } from "../../../lib/rate-limit";

const inputSchema = z.object({ product_id: z.string().uuid(), variant: variantSchema }).strict();

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user || user.app_metadata.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimit(request, { bucket: "admin-product-write", limit: 120, windowSeconds: 3600, identity: user.id });
  if (limited) return limited;
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the variant details." }, { status: 400 });
  const { data, error } = await db.from("product_variants").insert({ ...parsed.data.variant, product_id: parsed.data.product_id }).select().single();
  if (error) { console.error("[variants:create] Insert failed", { code: error.code }); return NextResponse.json({ error: "Unable to add variant." }, { status: 500 }); }
  revalidateProductCatalog();
  return NextResponse.json(data, { status: 201 });
}
