import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
export async function requireAdmin() { const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user || user.app_metadata.role!=="admin") redirect("/admin/login"); return {db,user}; }
