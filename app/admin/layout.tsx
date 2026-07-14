"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "../../components/admin/logout-button";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  if (pathname === "/admin/login") return children;
  const links = [["Dashboard", "/admin"], ["Products", "/admin/products"], ["Inventory", "/admin/inventory"], ["Orders", "/admin/orders"]] as const;
  const isActive = (href: string) => href === "/admin" ? pathname === href : pathname.startsWith(href);
  return <><header className="admin-shell"><Link className="brand" href="/admin" onClick={() => setMenuOpen(false)}><span>Sara</span><small>ADMIN</small></Link><nav className="admin-desktop-nav" aria-label="Admin navigation">{links.map(([label, href]) => <Link className={isActive(href) ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav><button className="admin-menu-toggle" type="button" aria-label={menuOpen ? "Close admin menu" : "Open admin menu"} aria-expanded={menuOpen} aria-controls="admin-mobile-menu" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={19}/> : <Menu size={20}/>}</button><LogoutButton /></header>{menuOpen && <nav id="admin-mobile-menu" className="admin-mobile-nav" aria-label="Mobile admin navigation">{links.map(([label, href]) => <Link className={isActive(href) ? "active" : ""} href={href} onClick={() => setMenuOpen(false)} key={href}>{label}</Link>)}</nav>}{children}</>;
}
