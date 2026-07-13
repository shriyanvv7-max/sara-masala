"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "../../components/admin/logout-button";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return children;
  return <><header className="admin-shell"><Link className="brand" href="/admin"><span>Sara</span><small>ADMIN</small></Link><nav><Link href="/admin">Dashboard</Link><Link href="/admin/products">Products</Link><Link href="/admin/inventory">Inventory</Link><Link href="/admin/orders">Orders</Link></nav><LogoutButton /></header>{children}</>;
}
