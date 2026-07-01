import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Search } from "lucide-react";
import { trackOrderFn } from "@/lib/orders.functions";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>): { order?: string } => ({
    order: typeof s.order === "string" ? s.order : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Track your order — ChitraFrame" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackPage,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Order confirmed",
  cod_pending: "Awaiting COD confirmation",
  printing: "Printing & framing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function TrackPage() {
  const { order } = Route.useSearch();
  const [orderId, setOrderId] = useState(order ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function track(id: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await trackOrderFn({ data: { orderId: id.trim() } });
      if (res.ok) setResult(res.orders);
      else { setResult(null); setError(res.error || "Order not found"); }
    } catch {
      setError("Could not fetch order. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (order) void track(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-xs uppercase tracking-[0.25em] text-accent">Support</div>
        <h1 className="mt-2 font-display text-4xl font-semibold">Track your order</h1>
        <p className="mt-2 text-muted-foreground">Enter your order ID (e.g. PS-250701-0001) to see its status.</p>

        <form onSubmit={(e) => { e.preventDefault(); void track(orderId); }} className="mt-8 flex gap-2">
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            placeholder="PS-XXXXXX-XXXX"
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
            <Search className="h-4 w-4" /> {loading ? "…" : "Track"}
          </button>
        </form>

        {error && <p className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

        {result?.map((o) => (
          <div key={o.order_id} className="mt-8 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="font-display text-lg font-semibold">{o.order_id}</span>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {STATUS_LABELS[o.status] || o.status}
              </span>
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd>₹{Number(o.total).toLocaleString("en-IN")}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Payment</dt><dd>{o.payment_method === "cod" ? "Cash on Delivery" : "Prepaid"}</dd></div>
              {o.awb_number && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tracking ({o.carrier})</dt>
                  <dd>{o.carrier_tracking_url ? <a href={o.carrier_tracking_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{o.awb_number}</a> : o.awb_number}</dd>
                </div>
              )}
            </dl>
            {Array.isArray(o.items) && (
              <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                {o.items.map((it: any, idx: number) => (
                  <li key={idx} className="flex justify-between">
                    <span>{it.name} <span className="text-muted-foreground">· {it.size} × {it.quantity}</span></span>
                    <span>₹{Number(it.price).toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}
