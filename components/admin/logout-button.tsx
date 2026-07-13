"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export function LogoutButton() {
  const router = useRouter(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function logout() { setLoading(true); setError(""); const { error } = await createClient().auth.signOut(); if (error) { setError("We could not sign you out. Please try again."); setLoading(false); return; } router.replace("/admin/login"); router.refresh(); }
  return <div className="logout"><button onClick={logout} disabled={loading}>{loading ? "Signing out…" : "Logout"}</button>{error && <span role="alert">{error}</span>}</div>;
}
