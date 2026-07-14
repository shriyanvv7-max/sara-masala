import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
type ButtonProps = { children: ReactNode; href?: string; ariaLabel?: string };
export function PrimaryButton({ children, href, ariaLabel }: ButtonProps) { const content=<>{children}<ArrowUpRight size={17} /></>; return href ? <Link href={href} className="button primary" aria-label={ariaLabel}>{content}</Link> : <button className="button primary" type="button" aria-label={ariaLabel}>{content}</button>; }
export function SecondaryButton({ children, href, ariaLabel }: ButtonProps) { return href ? <Link href={href} className="button secondary" aria-label={ariaLabel}>{children}</Link> : <button className="button secondary" type="button" aria-label={ariaLabel}>{children}</button>; }
