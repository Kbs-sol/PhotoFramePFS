// Client-side Razorpay checkout loader + launcher.
declare global {
  interface Window {
    Razorpay?: any;
  }
}

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export type RazorpayLaunchOptions = {
  key: string;
  amount: number; // paise
  currency: string;
  orderId: string; // razorpay order id
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  onSuccess: (resp: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
};

export async function launchRazorpay(opts: RazorpayLaunchOptions): Promise<void> {
  const ok = await loadRazorpay();
  if (!ok || !window.Razorpay) throw new Error("Failed to load payment gateway");
  const rzp = new window.Razorpay({
    key: opts.key,
    amount: opts.amount,
    currency: opts.currency,
    name: opts.name,
    description: opts.description,
    order_id: opts.orderId,
    prefill: opts.prefill,
    theme: opts.theme ?? { color: "#7a1f1f" },
    handler: (resp: any) => opts.onSuccess(resp),
    modal: { ondismiss: () => opts.onDismiss?.() },
  });
  rzp.open();
}
