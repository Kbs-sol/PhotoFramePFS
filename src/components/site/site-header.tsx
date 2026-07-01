import { Link } from "@tanstack/react-router";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";

const NAV = [
  { label: "Devotional", href: "/#devotional" },
  { label: "Sports", href: "/#sports" },
  { label: "Automotive", href: "/#automotive" },
  { label: "How it works", href: "/#how" },
  { label: "Track order", href: "/track" },
];

export function SiteHeader() {
  const { count, setOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight">
            Chitra<span className="text-primary">Frame</span>
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            Made in India
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/80 md:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="transition-colors hover:text-primary">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Open cart"
            onClick={() => setOpen(true)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border transition hover:border-primary/50 hover:text-primary"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-background px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-3 text-sm font-medium">
            {NAV.map((n) => (
              <li key={n.label}>
                <a href={n.href} onClick={() => setMobileOpen(false)} className="block py-1 hover:text-primary">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
