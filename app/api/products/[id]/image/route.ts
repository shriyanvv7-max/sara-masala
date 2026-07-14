import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { createClient } from "../../../../../lib/supabase/server";

async function getAdminClient() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return user?.app_metadata.role === "admin" ? db : null;
}

function storagePath(url: string | null) {
  if (!url) return null;
  try {
    const path = new URL(url).pathname;
    const marker = "/product-images/";
    const index = path.indexOf(marker);
    return index === -1 ? null : decodeURIComponent(path.slice(index + marker.length));
  } catch { return null; }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await getAdminClient();
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id;
  const { data: product } = await db.from("products").select("image").eq("id", id).single();
  const path = storagePath(product?.image ?? null);
  if (path) {
    const { error } = await supabaseAdmin().storage.from("product-images").remove([path]);
    if (error) return NextResponse.json({ error: "Unable to remove image." }, { status: 500 });
  }
  const { error } = await db.from("products").update({ image: null }).eq("id", id);
  return NextResponse.json(error ? { error: "Unable to remove image." } : { ok: true }, { status: error ? 500 : 200 });
}
