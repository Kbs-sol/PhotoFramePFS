import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { checkoutSchema, type CheckoutInput } from "@/lib/checkout-schema";
import { validatePincodeFn, estimateShippingFn } from "@/lib/shipping.functions";
import { createRazorpayOrderFn, verifyPaymentFn, applyCouponFn } from "@/lib/checkout.functions";
import { createOrderFn } from "@/lib/orders.functions";
import { launchRazorpay } from "@/lib/razorpay";
import { useCart } from "@/lib/cart";
import { SiteHeader } from "@/components/site/site-header";

type ShippingQuote = {
  shipping: number;
  total: number;
  cartTotal: number;
  freeShipping: boolean;
  estimatedDays: string;
  courier: string;
  codAvailable: boolean;
  shiprocketAvailable: boolean;
};

// Map storefront size codes to shipping SizeCode.
const SIZE_MAP: Record<string, "XS" | "S" | "M" | "L"> = {
  XS: "XS", S: "S", M: "M", L: "L",
  A4: "XS", Small: "S", Medium: "M", Large: "L",
};

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — ChitraFrame" },
      { name: "description", content: "Complete your order of made-in-India framed wall art." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type Errors = Partial<Record<keyof CheckoutInput, string>>;

const empty: CheckoutInput = {
  fullName: "", email: "", phone: "", addressLine1: "", addressLine2: "",
  city: "", state: "", pincode: "", notes: "",
};

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();

  const [values, setValues] = useState<CheckoutInput>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "prepaid">("prepaid");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<{ orderId: string; total: number; whatsappUrl: string } | null>(null);

  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);

  const [pinStatus, setPinStatus] = useState<
    | { state: "idle" } | { state: "checking" } | { state: "invalid"; message: string }
    | { state: "valid"; district: string; state_: string; express: boolean }
  >({ state: "idle" });
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const update = <K extends keyof CheckoutInput>(k: K, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const cartForApi = items.map((i) => ({
    variantId: i.variantId,
    price: i.price,
    quantity: i.quantity,
    name: i.name,
    slug: i.slug,
    size: SIZE_MAP[i.size] || "M",
    frame: i.frame,
    image: i.image,
  }));

  async function fetchQuote(pin: string, method: "cod" | "prepaid") {
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setPinStatus({ state: "invalid", message: "Enter a valid 6-digit PIN" });
      setQuote(null);
      return;
    }
    if (items.length === 0) return;
    setPinStatus((s) => (s.state === "valid" ? s : { state: "checking" }));
    setQuoteLoading(true);
    try {
      const [pinRes, quoteRes] = await Promise.all([
        validatePincodeFn({ data: { pincode: pin } }),
        estimateShippingFn({
          data: {
            pincode: pin,
            paymentMethod: method,
            items: cartForApi.map((i) => ({ size: i.size, price: i.price, quantity: i.quantity })),
          },
        }),
      ]);
      if (!pinRes.valid) {
        setPinStatus({ state: "invalid", message: "PIN not serviceable" });
        setQuote(null);
        return;
      }
      setPinStatus({ state: "valid", district: pinRes.district ?? "", state_: pinRes.state ?? "", express: pinRes.express });
      setValues((s) => ({ ...s, city: s.city || pinRes.district || "", state: s.state || pinRes.state || "" }));
      if (quoteRes.ok) {
        setQuote({
          shipping: quoteRes.shipping, total: quoteRes.total, cartTotal: quoteRes.cartTotal,
          freeShipping: quoteRes.freeShipping, estimatedDays: quoteRes.estimatedDays,
          courier: quoteRes.courier, codAvailable: quoteRes.codAvailable, shiprocketAvailable: quoteRes.shiprocketAvailable,
        });
      }
    } catch {
      setPinStatus({ state: "invalid", message: "Could not verify PIN" });
    } finally {
      setQuoteLoading(false);
    }
  }

  const onPincodeBlur = () => fetchQuote(values.pincode.trim(), paymentMethod);

  useEffect(() => {
    if (/^[1-9]\d{5}$/.test(values.pincode)) void fetchQuote(values.pincode, paymentMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod]);

  async function applyCoupon() {
    if (!coupon.trim()) return;
    try {
      const res = await applyCouponFn({ data: { code: coupon.trim(), subtotal } });
      if (res.ok) {
        setCouponApplied({ code: res.code, discount: res.discount });
        toast.success(res.message);
      } else {
        setCouponApplied(null);
        toast.error(res.error || "Invalid coupon");
      }
    } catch {
      toast.error("Coupon service unavailable");
    }
  }

  const shipping = quote?.shipping ?? 0;
  const discount = couponApplied?.discount ?? 0;
  const grandTotal = Math.max(1, subtotal + shipping - discount);

  async function placeOrder() {
    const parsed = checkoutSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CheckoutInput | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (paymentMethod === "cod" && quote && !quote.codAvailable) {
      toast.error("COD not available for this PIN — please choose prepaid.");
      return;
    }

    setProcessing(true);
    try {
      if (paymentMethod === "prepaid") {
        const rzpOrder = await createRazorpayOrderFn({
          data: { items: cartForApi.map((i) => ({ variantId: i.variantId, price: i.price, quantity: i.quantity, name: i.name })), couponCode: couponApplied?.code },
        });
        if (!rzpOrder.ok) {
          toast.error(rzpOrder.error || "Could not start payment");
          setProcessing(false);
          return;
        }
        await launchRazorpay({
          key: rzpOrder.key,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          orderId: rzpOrder.orderId,
          name: "ChitraFrame",
          description: `${items.length} item(s)`,
          prefill: { name: values.fullName, email: values.email, contact: values.phone },
          onDismiss: () => {
            setProcessing(false);
            toast("Payment cancelled");
          },
          onSuccess: async (resp) => {
            try {
              // Create the order first so we have an internal order_id to sync.
              const order = await createOrderFn({
                data: {
                  items: cartForApi, customer: parsed.data, paymentMethod: "prepaid",
                  paymentId: resp.razorpay_payment_id, razorpayOrderId: resp.razorpay_order_id,
                  razorpaySignature: resp.razorpay_signature, couponCode: couponApplied?.code,
                },
              });
              const verify = await verifyPaymentFn({
                data: { ...resp, order_id: order.ok ? order.orderId : undefined },
              });
              if (!verify.ok || !verify.verified) {
                toast.error("Payment verification failed. Contact support with your payment ID.");
                setProcessing(false);
                return;
              }
              if (order.ok) {
                clear();
                setDone({ orderId: order.orderId, total: order.total, whatsappUrl: order.whatsappUrl });
              }
            } catch {
              toast.error("Something went wrong finalizing your order.");
            } finally {
              setProcessing(false);
            }
          },
        });
      } else {
        // COD
        const order = await createOrderFn({
          data: { items: cartForApi, customer: parsed.data, paymentMethod: "cod", couponCode: couponApplied?.code },
        });
        if (!order.ok) {
          toast.error(order.error || "Could not place order");
          setProcessing(false);
          return;
        }
        clear();
        setDone({ orderId: order.orderId, total: order.total, whatsappUrl: order.whatsappUrl });
        setProcessing(false);
      }
    } catch (e) {
      toast.error("Checkout failed. Please try again.");
      setProcessing(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-semibold">Order placed!</h1>
          <p className="mt-2 text-muted-foreground">
            Order <strong>{done.orderId}</strong> · ₹{done.total.toLocaleString("en-IN")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            We've emailed your confirmation. {paymentMethod === "cod" && "Please confirm your COD order on WhatsApp."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={done.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-medium text-white">
              Confirm on WhatsApp
            </a>
            <Link to="/track" search={{ order: done.orderId } as never} className="rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:border-primary/40">
              Track order
            </Link>
            <button onClick={() => navigate({ to: "/" })} className="rounded-full px-6 py-2.5 text-sm font-medium text-primary hover:underline">
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="font-display text-3xl font-semibold">Shipping details</h1>
          <p className="mt-2 text-sm text-muted-foreground">Made-to-order, dispatched within 72 hours across India.</p>

          <form onSubmit={(e) => { e.preventDefault(); void placeOrder(); }} noValidate className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.fullName} className="sm:col-span-2">
              <input type="text" autoComplete="name" maxLength={80} value={values.fullName} onChange={(e) => update("fullName", e.target.value)} className={inputCls(!!errors.fullName)} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input type="email" inputMode="email" autoComplete="email" maxLength={254} value={values.email} onChange={(e) => update("email", e.target.value)} className={inputCls(!!errors.email)} />
            </Field>
            <Field label="Mobile (10 digits)" error={errors.phone}>
              <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={values.phone} onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))} className={inputCls(!!errors.phone)} />
            </Field>
            <Field label="Address line 1" error={errors.addressLine1} className="sm:col-span-2">
              <input type="text" autoComplete="address-line1" maxLength={120} value={values.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} className={inputCls(!!errors.addressLine1)} />
            </Field>
            <Field label="Address line 2 (optional)" error={errors.addressLine2} className="sm:col-span-2">
              <input type="text" autoComplete="address-line2" maxLength={120} value={values.addressLine2 ?? ""} onChange={(e) => update("addressLine2", e.target.value)} className={inputCls(!!errors.addressLine2)} />
            </Field>
            <Field label="City" error={errors.city}>
              <input type="text" autoComplete="address-level2" maxLength={60} value={values.city} onChange={(e) => update("city", e.target.value)} className={inputCls(!!errors.city)} />
            </Field>
            <Field label="State" error={errors.state}>
              <input type="text" autoComplete="address-level1" maxLength={60} value={values.state} onChange={(e) => update("state", e.target.value)} className={inputCls(!!errors.state)} />
            </Field>
            <Field label="PIN code" error={errors.pincode}>
              <input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={values.pincode} onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ""))} onBlur={onPincodeBlur} className={inputCls(!!errors.pincode)} />
              {pinStatus.state === "checking" && <span className="mt-1 block text-xs text-muted-foreground">Checking deliverability…</span>}
              {pinStatus.state === "invalid" && <span className="mt-1 block text-xs text-destructive">{pinStatus.message}</span>}
              {pinStatus.state === "valid" && <span className="mt-1 block text-xs text-emerald-600">Delivers to {pinStatus.district}, {pinStatus.state_}{pinStatus.express ? " · Express (1–2 days)" : ""}</span>}
            </Field>

            <Field label="Payment method" className="sm:col-span-2">
              <div className="flex gap-3">
                {(["prepaid", "cod"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`flex-1 rounded-md border px-3 py-2 text-sm ${paymentMethod === m ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                    {m === "prepaid" ? "Prepaid (UPI/Card)" : "Cash on Delivery"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Order notes (optional)" error={errors.notes} className="sm:col-span-2">
              <textarea maxLength={500} rows={3} value={values.notes ?? ""} onChange={(e) => update("notes", e.target.value)} className={inputCls(!!errors.notes)} />
            </Field>
          </form>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Order summary</h2>
            {items.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Your cart is empty. <Link to="/" className="text-primary hover:underline">Browse products</Link>.
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  {items.map((i) => (
                    <div key={i.variantId} className="flex items-center gap-3">
                      <img src={i.image} alt={i.name} className="h-14 w-12 rounded object-cover" />
                      <div className="flex-1 text-sm">
                        <div className="font-medium leading-tight">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{i.size} · ×{i.quantity}</div>
                      </div>
                      <div className="text-sm font-medium">₹{(i.price * i.quantity).toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
                  <button type="button" onClick={applyCoupon} className="rounded-md bg-foreground px-4 text-sm font-medium text-background">Apply</button>
                </div>

                <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>₹{subtotal.toLocaleString("en-IN")}</dd></div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Shipping{quote?.shiprocketAvailable ? ` · ${quote.courier}` : ""}</dt>
                    <dd>{quote ? (quote.freeShipping ? <span className="text-emerald-600">FREE</span> : `₹${quote.shipping}`) : <span className="text-muted-foreground">Enter PIN</span>}</dd>
                  </div>
                  {discount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount ({couponApplied?.code})</dt><dd>−₹{discount}</dd></div>}
                  <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-semibold"><dt>Total</dt><dd>₹{grandTotal.toLocaleString("en-IN")}</dd></div>
                </dl>

                {quote && <p className="mt-2 text-xs text-muted-foreground">Estimated delivery in {quote.estimatedDays} days.{quoteLoading && " Refreshing…"}</p>}

                <button type="button" disabled={processing || items.length === 0} onClick={placeOrder} className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-60">
                  {processing ? "Processing…" : paymentMethod === "prepaid" ? `Pay ₹${grandTotal.toLocaleString("en-IN")}` : "Place COD order"}
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">Secure Razorpay checkout · re-verified server-side.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-md border bg-card px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 ${hasError ? "border-destructive" : "border-border focus:border-primary/60"}`;
}
