import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <Suspense fallback={<main className="form-page">Loading sign in...</main>}><LoginForm /></Suspense>;
}
