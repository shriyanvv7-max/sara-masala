import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "../../../../lib/supabase/server";
import { productSchema } from "../../../../lib/validations";

const archiveActionSchema = z.object({ action: z.enum(["archive", "restore"]) });
const historyMessage = "This product has order history and cannot be permanently deleted.";

async function admin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return user?.app_metadata.role === "admin" ? db : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await admin();
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const action = archiveActionSchema.safeParse(body);
  const id = (await params).id;
  if (action.success) {
    const archived = action.data.action === "archive";
    const { data, error } = await db.rpc("set_product_archived", { p_product_id: id, p_archived: archived });
    if (error) {
      console.error("[products] Archive state update failed", { code: error.code, message: error.message });
      return NextResponse.json({ error: archived ? "Unable to archive product." : "Unable to restore product." }, { status: 500 });
    }
    return NextResponse.json(data);
  }
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the product details." }, { status: 400 });
  const { data, error } = await db.from("products").update(parsed.data).eq("id", id).select().single();
  return NextResponse.json(error ? { error: "Unable to save product." } : data, { status: error ? 500 : 200 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await admin();
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id;
  const { data: variants, error: variantError } = await db.from("product_variants").select("id").eq("product_id", id);
  if (variantError) return NextResponse.json({ error: "Unable to check product order history." }, { status: 500 });
  const variantIds = (variants || []).map(variant => variant.id);
  if (variantIds.length) {
    const { count, error: historyError } = await db.from("order_items").select("id", { count: "exact", head: true }).in("variant_id", variantIds);
    if (historyError) return NextResponse.json({ error: "Unable to check product order history." }, { status: 500 });
    if ((count || 0) > 0) return NextResponse.json({ error: historyMessage, code: "PRODUCT_HAS_ORDER_HISTORY" }, { status: 409 });
  }
  const { error } = await db.from("products").delete().eq("id", id);
  if (error?.code === "23503") return NextResponse.json({ error: historyMessage, code: "PRODUCT_HAS_ORDER_HISTORY" }, { status: 409 });
  return NextResponse.json(error ? { error: "Unable to delete product." } : { ok: true }, { status: error ? 500 : 200 });
}
