"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client that persists the auth session in cookies for App Router middleware. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
