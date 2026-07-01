import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, ShoppingBag, Truck } from "lucide-react";
import { getProduct, sizes, frameTypes, frameFinishes, products } from "@/lib/products";
import { validatePincodeFn } from "@/lib/shipping.functions";
import { useCart } from "@/lib/cart";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.title} — ChitraFrame` },
      { name: "description", content: loaderData?.product.description ?? "" },
      { property: "og:title", content: `${loaderData?.product.title} — ChitraFrame` },
      { property: "og:image", content: loaderData?.product.image ?? "" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { add, setOpen } = useCart();

  const [sizeId, setSizeId] = useState<(typeof sizes)[number]["id"]>("s");
  const [frameId, setFrameId] = useState<(typeof frameTypes)[number]["id"]>("direct");
  const [finishId, setFinishId] = useState(frameFinishes[0].id);
  const [qty, setQty] = useState(1);

  const [pin, setPin] = useState("");
  const [pinStatus, setPinStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "invalid"; message: string }
    | { state: "valid"; district: string; state_: string; express: boolean; days: string }
  >({ state: "idle" });

  const size = sizes.find((s) => s.id === sizeId)!;
  const frame = frameTypes.find((f) => f.id === frameId)!;
  const finish = frameFinishes.find((f) => f.id === finishId)!;

  const unitPrice = useMemo(
    () => product.price + size.delta + frame.priceDelta,
    [product.price, size.delta, frame.priceDelta],
  );

  const related = products.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 3);

  async function checkPin() {
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setPinStatus({ state: "invalid", message: "Enter a valid 6-digit PIN" });
      return;
    }
    setPinStatus({ state: "checking" });
    try {
      const res = await validatePincodeFn({ data: { pincode: pin } });
      if (!res.valid) {
        setPinStatus({ state: "invalid", message: "Not serviceable at this PIN" });
        return;
      }
      setPinStatus({
        state: "valid",
        district: res.district ?? "",
        state_: res.state ?? "",
        express: res.express,
        days: res.estimatedDays,
      });
    } catch {
      setPinStatus({ state: "invalid", message: "Could not check PIN" });
    }
  }

  function addToCart(openCart: boolean) {
    add({
      variantId: `${product.slug}-${size.code}-${frameId}-${finishId}`,
      slug: product.slug,
      name: product.title,
      image: product.image,
      size: size.code,
      frame: `${frame.label} · ${finish.label}`,
      price: unitPrice,
      quantity: qty,
    });
    toast.success("Added to cart", { description: `${product.title} · ${size.code} · ${frame.label}` });
    if (openCart) setOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to collection
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              className={`relative overflow-hidden rounded-xl bg-cream shadow-lg transition-all`}
              style={{ padding: frameId === "mount" ? "9%" : "0", backgroundColor: frameId === "mount" ? finish.swatch : undefined }}
            >
              <div style={{ padding: frameId === "mount" ? "6%" : "0", background: frameId === "mount" ? "#fff" : undefined }}>
                <img src={product.image} alt={product.title} className="aspect-[4/5] w-full rounded object-cover" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded-full border border-border" style={{ background: finish.swatch }} />
              {finish.label} frame · {frame.label}
            </div>
          </div>

          {/* Configurator */}
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-accent">{product.category}</div>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight">{product.title}</h1>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-semibold">₹{unitPrice.toLocaleString("en-IN")}</span>
              <span className="text-sm text-muted-foreground">incl. frame · excl. shipping</span>
            </div>
            <p className="mt-4 text-muted-foreground">{product.description}</p>

            {/* Size */}
            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Size</span>
                <span className="text-xs text-muted-foreground">{size.scale}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSizeId(s.id)}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      sizeId === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="font-medium">{s.code}</div>
                    <div className="text-xs text-muted-foreground">{s.dims}</div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{size.useCase}</p>
            </div>

            {/* Frame type */}
            <div className="mt-6">
              <span className="mb-2 block text-sm font-medium">Frame style</span>
              <div className="grid grid-cols-2 gap-2">
                {frameTypes.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFrameId(f.id)}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      frameId === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{f.label}</span>
                      {f.priceDelta > 0 && <span className="text-xs text-muted-foreground">+₹{f.priceDelta}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{f.tagline}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Finish */}
            <div className="mt-6">
              <span className="mb-2 block text-sm font-medium">Frame finish</span>
              <div className="flex flex-wrap gap-2">
                {frameFinishes.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFinishId(f.id)}
                    aria-label={f.label}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                      finishId === f.id ? "border-primary" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="inline-block h-4 w-4 rounded-full border border-black/10" style={{ background: f.swatch }} />
                    {f.label}
                    {finishId === f.id && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mt-6 flex items-center gap-4">
              <span className="text-sm font-medium">Quantity</span>
              <div className="inline-flex items-center rounded-full border border-border">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-9 w-9 hover:text-primary">−</button>
                <span className="w-10 text-center text-sm">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(20, q + 1))} className="h-9 w-9 hover:text-primary">+</button>
              </div>
            </div>

            {/* Deliverability */}
            <div className="mt-6 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Truck className="h-4 w-4 text-primary" /> Check delivery
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit PIN"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
                <button onClick={checkPin} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
                  Check
                </button>
              </div>
              {pinStatus.state === "checking" && <p className="mt-2 text-xs text-muted-foreground">Checking…</p>}
              {pinStatus.state === "invalid" && <p className="mt-2 text-xs text-destructive">{pinStatus.message}</p>}
              {pinStatus.state === "valid" && (
                <p className="mt-2 text-xs text-emerald-600">
                  Delivers to {pinStatus.district}, {pinStatus.state_} · {pinStatus.express ? "Express 1–2 days" : `${pinStatus.days} days`}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => addToCart(false)}
                className="flex-1 rounded-full border border-primary bg-transparent px-6 py-3 text-sm font-medium text-primary transition hover:bg-primary/5"
              >
                Add to cart
              </button>
              <button
                onClick={() => addToCart(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
              >
                <ShoppingBag className="h-4 w-4" /> Buy now
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
              Made to order · dispatched within 72 hours · secure Razorpay checkout
            </p>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="mb-6 font-display text-2xl font-semibold">You may also like</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {related.map((p) => (
                <Link key={p.slug} to="/product/$slug" params={{ slug: p.slug }} className="group block">
                  <div className="overflow-hidden rounded-lg bg-cream">
                    <img src={p.image} alt={p.title} className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.04]" loading="lazy" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-display font-semibold">{p.title}</span>
                    <span className="text-sm text-muted-foreground">₹{p.price}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
