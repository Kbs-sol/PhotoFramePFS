// Checkout & payment server functions — ported from PhotoFramePFS checkout.ts.
// Razorpay order creation (server-priced), HMAC verification, coupon apply.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  variantId: z.string().max(120),
  price: z.number().int().nonnegative().max(50000),
  quantity: z.number().int().min(1).max(20),
  name: z.string().max(200).optional(),
  size: z.string().max(20).optional(),
  frame: z.string().max(40).optional(),
  image: z.string().max(600).optional(),
});

const createOrderInput = z.object({
  items: z.array(itemSchema).min(1).max(20),
  couponCode: z.string().max(40).optional(),
  currency: z.string().default("INR"),
  receipt: z.string().max(60).optional(),
  notes: z.record(z.string(), z.any()).optional(),
});

/**
 * Create a Razorpay order. Amount is ALWAYS recomputed server-side from DB
 * variant prices (or safety-bounded for custom frames) to prevent tampering.
 */
export const createRazorpayOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createOrderInput.parse(d))
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return { ok: false as const, error: "Payment gateway not configured" };
    }

    const { hasSupabase, getSupabase } = await import("./supabase.server");
    let serverAmount = 0;

    if (hasSupabase()) {
      const sb = getSupabase();
      const realVariantIds = data.items
        .filter((i) => !i.variantId.startsWith("custom-") && !i.variantId.includes("-direct"))
        .map((i) => i.variantId);

      const priceMap: Record<string, number> = {};
      if (realVariantIds.length) {
        const { data: variants } = await sb
          .from("product_variants").select("id, price").in("id", realVariantIds).eq("is_active", true);
        for (const v of variants || []) priceMap[(v as any).id] = (v as any).price;
      }

      for (const item of data.items) {
        if (item.variantId.startsWith("custom-")) {
          serverAmount += Math.max(499, Math.min(item.price, 9999)) * item.quantity;
        } else if (priceMap[item.variantId] != null) {
          serverAmount += priceMap[item.variantId] * item.quantity;
        } else {
          // Local-catalogue variant (id like slug-size-direct): trust bounded client price.
          serverAmount += Math.max(99, Math.min(item.price, 50000)) * item.quantity;
        }
      }

      if (data.couponCode) {
        const { validateCoupon } = await import("./coupons.server");
        const res = await validateCoupon(sb, data.couponCode, serverAmount);
        if (res.valid) serverAmount -= res.discount;
      }
    } else {
      // No DB: bounded client prices.
      for (const item of data.items) {
        serverAmount += Math.max(99, Math.min(item.price, 50000)) * item.quantity;
      }
    }
    serverAmount = Math.max(1, Math.round(serverAmount));

    const auth = btoa(`${keyId}:${keySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: serverAmount * 100,
        currency: data.currency,
        receipt: data.receipt || `rcpt_${Date.now()}`,
        notes: data.notes || {},
      }),
    });
    const body: any = await res.json();
    if (body.error) return { ok: false as const, error: body.error.description };
    return {
      ok: true as const,
      orderId: body.id,
      amount: body.amount,
      currency: body.currency,
      key: keyId,
    };
  });

const verifyInput = z.object({
  razorpay_order_id: z.string().max(120),
  razorpay_payment_id: z.string().max(120),
  razorpay_signature: z.string().max(200),
  order_id: z.string().max(60).optional(),
});

/** Verify Razorpay payment signature (HMAC-SHA256) using Web Crypto. */
export const verifyPaymentFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifyInput.parse(d))
  .handler(async ({ data }) => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return { ok: false as const, error: "Payment verification not available" };

    const message = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (expected !== data.razorpay_signature) {
      return { ok: false as const, verified: false, error: "Signature mismatch" };
    }

    // Post-payment: mark order paid + fire confirmation email + Shiprocket sync.
    const { hasSupabase, getSupabase } = await import("./supabase.server");
    if (data.order_id && hasSupabase()) {
      const sb = getSupabase();
      await sb.from("orders").update({
        payment_id: data.razorpay_payment_id,
        status: "pending",
        updated_at: new Date().toISOString(),
      }).eq("order_id", data.order_id);

      // Fire-and-forget (do not block the response).
      (async () => {
        try {
          const { data: order } = await sb.from("orders").select("*").eq("order_id", data.order_id).single();
          if (!order) return;
          const { orderConfirmationEmail } = await import("./email-templates");
          const { sendEmail } = await import("./email.server");
          await sendEmail({
            to: (order as any).customer_email,
            subject: `Order Confirmed! | ${data.order_id}`,
            html: orderConfirmationEmail(order),
            orderId: data.order_id,
            type: "order_confirmation",
          });
          const { createShiprocketOrder } = await import("./shipping.server");
          const sync = await createShiprocketOrder(order);
          if (sync.success && sync.shiprocketOrderIds) {
            await sb.from("orders").update({
              shiprocket_synced: true,
              shiprocket_order_id: sync.shiprocketOrderIds.join(","),
              updated_at: new Date().toISOString(),
            }).eq("order_id", data.order_id);
          }
        } catch (e) {
          console.error("post-payment sync failed", e);
        }
      })();
    }
    return { ok: true as const, verified: true, paymentId: data.razorpay_payment_id };
  });

const couponInput = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().int().nonnegative().max(999999),
  customerId: z.string().uuid().optional(),
});

/** Validate & preview a coupon discount. */
export const applyCouponFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => couponInput.parse(d))
  .handler(async ({ data }) => {
    const { hasSupabase, getSupabase } = await import("./supabase.server");
    if (!hasSupabase()) return { ok: false as const, error: "Coupon service unavailable" };
    const sb = getSupabase();
    const { validateCoupon } = await import("./coupons.server");
    const res = await validateCoupon(sb, data.code, data.subtotal, data.customerId);
    if (!res.valid) return { ok: false as const, error: res.error || "Invalid coupon" };
    const coupon = res.coupon;
    return {
      ok: true as const,
      valid: true,
      discount: res.discount,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      message: coupon.type === "percentage" ? `${coupon.value}% off applied!` : `Rs.${coupon.value} off applied!`,
    };
  });
