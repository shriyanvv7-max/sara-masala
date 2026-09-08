import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { detectProductImageType, MAX_PRODUCT_IMAGE_BYTES, productImageStoragePath, safeProductImageExtension } from "../../../../lib/product-image-security";
import { rateLimit } from "../../../../lib/rate-limit";

async function getAdmin() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  return user?.app_metadata.role === "admin" ? user : null;
}

export async function POST(request: Request) {
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimit(request, { bucket: "product-image-upload", limit: 20, windowSeconds: 3600, identity: user.id });
  if (limited) return limited;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_PRODUCT_IMAGE_BYTES + 500_000) return NextResponse.json({ error: "Please upload a JPEG, PNG or WebP image under 5 MB." }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_PRODUCT_IMAGE_BYTES) return NextResponse.json({ error: "Please upload a JPEG, PNG or WebP image under 5 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectProductImageType(bytes);
  if (!detectedType || file.type !== detectedType) return NextResponse.json({ error: "Only valid JPEG, PNG or WebP images are supported." }, { status: 400 });
  const path = `${crypto.randomUUID()}.${safeProductImageExtension(detectedType)}`;
  const storage = supabaseAdmin();
  const { error } = await storage.storage.from("product-images").upload(path, bytes, { contentType: detectedType, cacheControl: "31536000", upsert: false });
  if (error) { console.error("[upload:product-image] Storage upload failed", { code: error.message ? "storage_error" : "unknown" }); return NextResponse.json({ error: "Unable to upload image." }, { status: 500 }); }
  const { data } = storage.storage.from("product-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

export async function DELETE(request: Request) {
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimit(request, { bucket: "product-image-delete", limit: 50, windowSeconds: 3600, identity: user.id });
  if (limited) return limited;
  const imageUrl = new URL(request.url).searchParams.get("url");
  const path = productImageStoragePath(imageUrl);
  if (!path) return NextResponse.json({ error: "Invalid product image URL." }, { status: 400 });
  const { error } = await supabaseAdmin().storage.from("product-images").remove([path]);
  return NextResponse.json(error ? { error: "Unable to remove image." } : { ok: true }, { status: error ? 500 : 200 });
}
