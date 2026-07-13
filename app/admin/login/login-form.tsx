"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(params.get("error") === "permission" ? "You do not have permission to access the admin dashboard." : "");
  const [loading, setLoading] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) { setMessage("We could not sign you in. Please check your email and password."); setLoading(false); return; }
    if (data.user.app_metadata.role !== "admin") { await supabase.auth.signOut(); setMessage("You do not have permission to access the admin dashboard."); setLoading(false); return; }
    router.replace("/admin"); router.refresh();
  }

  return <main className="form-page"><p className="eyebrow">SARA MASALA</p><h1>Admin sign in</h1><form onSubmit={signIn}><input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin email"/><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"/><button className="add-cart" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>{message && <p role="alert">{message}</p>}</form></main>;
}
