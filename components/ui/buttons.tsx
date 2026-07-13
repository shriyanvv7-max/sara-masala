import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
export function PrimaryButton({ children }: { children: ReactNode }) { return <button className="button primary">{children}<ArrowUpRight size={17} /></button>; }
export function SecondaryButton({ children }: { children: ReactNode }) { return <button className="button secondary">{children}</button>; }
