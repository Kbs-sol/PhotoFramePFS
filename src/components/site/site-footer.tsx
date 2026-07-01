import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-cream/40">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="font-display text-xl font-semibold">
              Chitra<span className="text-primary">Frame</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Museum-grade framed prints, made to order in India. No warehouses, no waste — just craft.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shop</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="/#devotional" className="hover:text-primary">Devotional</a></li>
              <li><a href="/#sports" className="hover:text-primary">Sports</a></li>
              <li><a href="/#automotive" className="hover:text-primary">Automotive</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Help</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/track" className="hover:text-primary">Track order</Link></li>
              <li><a href="/#how" className="hover:text-primary">How it's made</a></li>
              <li><a href="mailto:hello@chitraframe.in" className="hover:text-primary">Contact</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Promise</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Free shipping over ₹999</li>
              <li>Ships in 72 hours</li>
              <li>Damage-free guarantee</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} ChitraFrame. Made with care in India.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary">Shipping</a>
            <a href="#" className="hover:text-primary">Returns</a>
            <a href="#" className="hover:text-primary">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
