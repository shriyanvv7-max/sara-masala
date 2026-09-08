import type { Metadata } from "next";
import { AdminLayoutShell } from "../../components/admin/admin-layout-shell";

export const metadata: Metadata = { title: "Admin", alternates: { canonical: null }, robots: { index: false, follow: false, noarchive: true, nosnippet: true } };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
