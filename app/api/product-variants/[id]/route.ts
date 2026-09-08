import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "../../../../lib/supabase/server";
import { variantSchema } from "../../../../lib/validations";
import { revalidateProductCatalog } from "../../../../lib/catalog-cache";
import { rateLimit } from "../../../../lib/rate-limit";

async function admin() {
  const db = await createClient(); const { data: { user } } = await db.auth.getUser();
  return user?.app_metadata.role === "admin" ? { db, user } : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await admin(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimit(request, { bucket: "admin-product-write", limit: 120, windowSeconds: 3600, identity: context.user.id }); if (limited) return limited;
  const [parsed, id] = [variantSchema.safeParse(await request.json().catch(() => null)), z.string().uuid().safeParse((await params).id)];
  if (!parsed.success || !id.success) return NextResponse.json({ error: "Please check the variant details." }, { status: 400 });
  const { data, error } = await context.db.from("product_variants").update(parsed.data).eq("id", id.data).select().single();
  if (error) { console.error("[variants:update] Update failed", { code: error.code }); return NextResponse.json({ error: "Unable to save variant." }, { status: 500 }); }
  revalidateProductCatalog(); return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await admin(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimit(request, { bucket: "admin-product-write", limit: 120, windowSeconds: 3600, identity: context.user.id }); if (limited) return limited;
  const id = z.string().uuid().safeParse((await params).id); if (!id.success) return NextResponse.json({ error: "Invalid variant." }, { status: 400 });
  const { error } = await context.db.from("product_variants").delete().eq("id", id.data);
  if (error?.code === "23503") return NextResponse.json({ error: "This variant has order history and cannot be permanently deleted. Deactivate it instead." }, { status: 409 });
  if (error) { console.error("[variants:delete] Delete failed", { code: error.code }); return NextResponse.json({ error: "Unable to delete variant." }, { status: 500 }); }
  revalidateProductCatalog(); return NextResponse.json({ ok: true });
}
