"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PiggyBank,
  Wallet,
  Users,
  TrendingUp,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNT_LABELS } from "@/lib/account-labels";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/maribank", label: ACCOUNT_LABELS.maribank.primary, icon: PiggyBank },
  { href: "/dbs", label: ACCOUNT_LABELS.dbs.primary, icon: Wallet },
  { href: "/receivables", label: "Owed", icon: Users },
  { href: "/hsbc", label: ACCOUNT_LABELS.hsbc.primary, icon: TrendingUp },
  { href: "/mendaki", label: ACCOUNT_LABELS.mendaki.primary, icon: Landmark },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-6">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary"
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
