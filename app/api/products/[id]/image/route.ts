import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { createClient } from "../../../../../lib/supabase/server";
import { productImageStoragePath } from "../../../../../lib/product-image-security";
import { rateLimit } from "../../../../../lib/rate-limit";
import { revalidateProductCatalog } from "../../../../../lib/catalog-cache";
import { z } from "zod";

async function getAdminClient() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return user?.app_metadata.role === "admin" ? db : null;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await getAdminClient();
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await db.auth.getUser();
  const limited = await rateLimit(request, { bucket: "product-image-delete", limit: 50, windowSeconds: 3600, identity: user!.id });
  if (limited) return limited;
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  const { data: product } = await db.from("products").select("image").eq("id", id.data).single();
  const path = productImageStoragePath(product?.image ?? null);
  if (path) {
    const { error } = await supabaseAdmin().storage.from("product-images").remove([path]);
    if (error) return NextResponse.json({ error: "Unable to remove image." }, { status: 500 });
  }
  const { error } = await db.from("products").update({ image: null }).eq("id", id.data);
  if (!error) revalidateProductCatalog();
  return NextResponse.json(error ? { error: "Unable to remove image." } : { ok: true }, { status: error ? 500 : 200 });
}
