import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Truck, ShieldCheck, PackageCheck } from "lucide-react";
import { products, type Category } from "@/lib/products";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import krishna from "@/assets/designs/krishna-flute-melody.jpg";
import porsche from "@/assets/designs/porsche-911-sunset-drive.jpg";
import ganesh from "@/assets/designs/shree-ganesh-golden-aura.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChitraFrame — Museum-grade framed prints, made in India" },
      {
        name: "description",
        content:
          "Devotional, sports and automotive framed wall art. Made-to-order, ships in 72 hours across India. From ₹449.",
      },
    ],
  }),
  component: Home,
});

const CATEGORIES: Category[] = ["Devotional", "Sports", "Automotive"];

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 12%, var(--color-gold) 0, transparent 42%), radial-gradient(circle at 88% 82%, var(--color-primary) 0, transparent 48%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Made-to-order · Ships in 72 hours
            </div>
            <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl">
              Wall art that <span className="italic text-primary">feels like home.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Museum-grade framed prints — devotional, sports, automotive. Hand-finished in India,
              delivered to your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#shop"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
              >
                Browse the collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#how"
                className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition hover:border-primary/40"
              >
                How it's made
              </a>
            </div>
            <dl className="mt-10 flex items-center gap-8 text-xs uppercase tracking-widest text-muted-foreground">
              <div>
                <dd className="font-display text-2xl text-foreground">7</dd>
                Signature designs
              </div>
              <div>
                <dd className="font-display text-2xl text-foreground">4</dd>
                Sizes
              </div>
              <div>
                <dd className="font-display text-2xl text-foreground">₹449</dd>
                Starting
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-accent/30 via-transparent to-primary/20 blur-2xl" />
            <div className="grid grid-cols-2 gap-4">
              <img
                src={krishna}
                alt="Krishna's Flute Melody framed print"
                className="aspect-[4/5] w-full rounded-lg object-cover shadow-2xl"
              />
              <div className="mt-10 space-y-4">
                <img
                  src={porsche}
                  alt="Porsche 911 Coastal Drive framed print"
                  className="aspect-[4/5] w-full rounded-lg object-cover shadow-2xl"
                />
                <img
                  src={ganesh}
                  alt="Shree Ganesh Golden Aura framed print"
                  className="aspect-square w-full rounded-lg object-cover shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-border bg-cream/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-6 text-sm md:grid-cols-4">
          {[
            [<Truck key="t" className="h-5 w-5 text-primary" />, "Free shipping", "On orders over ₹999"],
            [<PackageCheck key="p" className="h-5 w-5 text-primary" />, "Ships in 72h", "Made to order"],
            [<ShieldCheck key="s" className="h-5 w-5 text-primary" />, "Damage-free", "Guaranteed or replaced"],
            [<Sparkles key="sp" className="h-5 w-5 text-primary" />, "Archival quality", "240gsm giclée"],
          ].map(([icon, t, s], i) => (
            <div key={i} className="flex items-center gap-3">
              {icon}
              <div>
                <div className="font-medium">{t}</div>
                <div className="text-xs text-muted-foreground">{s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SHOP */}
      <section id="shop" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-[0.25em] text-accent">The Collection</div>
          <h2 className="mt-2 text-4xl font-semibold md:text-5xl">Featured prints</h2>
        </div>

        {CATEGORIES.map((cat) => (
          <div key={cat} id={cat.toLowerCase()} className="mb-16 scroll-mt-24">
            <h3 className="mb-6 font-display text-2xl font-semibold">{cat}</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products
                .filter((p) => p.category === cat)
                .map((p) => (
                  <article key={p.slug} className="group">
                    <Link to="/product/$slug" params={{ slug: p.slug }} className="block">
                      <div className="relative overflow-hidden rounded-lg bg-cream">
                        <img
                          src={p.image}
                          alt={p.title}
                          className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                        <div className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] uppercase tracking-wider text-foreground shadow">
                          {p.category}
                        </div>
                      </div>
                      <div className="mt-4 flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-display text-lg font-semibold leading-tight">{p.title}</h4>
                          <p className="mt-1 text-xs text-muted-foreground">Framed · from ₹{p.price}</p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                    </Link>
                  </article>
                ))}
            </div>
          </div>
        ))}
      </section>

      {/* HOW */}
      <section id="how" className="border-t border-border bg-cream/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-xs uppercase tracking-[0.25em] text-accent">The process</div>
          <h2 className="mt-2 text-4xl font-semibold md:text-5xl">From order to wall in 5 days.</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              ["01", "Choose", "Pick a design, size, and frame finish."],
              ["02", "Print", "Giclée print on 240gsm archival paper."],
              ["03", "Frame", "Hand-mounted in solid wood, glass-fronted."],
              ["04", "Deliver", "Free shipping across India above ₹999."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="font-display text-3xl text-accent">{n}</div>
                <div className="mt-2 font-display text-xl font-semibold">{t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="mx-auto max-w-2xl text-4xl font-semibold md:text-5xl">
          Fill your walls with <span className="italic text-primary">meaning.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Every ChitraFrame is made to order — no warehouses, no waste, just craft.
        </p>
        <a
          href="#shop"
          className="mt-8 inline-block rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
        >
          Shop the collection
        </a>
      </section>

      <SiteFooter />
    </div>
  );
}
