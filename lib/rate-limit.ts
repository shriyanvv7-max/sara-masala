import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase/admin";

type RateLimitOptions = {
  bucket: string;
  limit: number;
  windowSeconds: number;
  identity?: string;
};

function requestIdentity(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for");
  return request.headers.get("x-real-ip") || forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function rateLimit(request: Request, options: RateLimitOptions) {
  const identity = options.identity || requestIdentity(request);
  const keyHash = createHash("sha256").update(`${options.bucket}:${identity}`).digest("hex");
  const { data, error } = await supabaseAdmin().rpc("consume_api_rate_limit", {
    p_bucket: options.bucket,
    p_key_hash: keyHash,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });
  if (error) {
    console.error("[security:rate-limit] Check unavailable", { bucket: options.bucket, code: error.code });
    return null;
  }
  if (data !== false) return null;
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(options.windowSeconds), "Cache-Control": "no-store" } },
  );
}
