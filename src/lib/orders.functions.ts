// Order server functions — ported from PhotoFramePFS orders.ts.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkoutSchema } from "./checkout-schema";

const orderItemSchema = z.object({
  variantId: z.string().max(120),
  price: z.number().int().nonnegative().max(50000),
  quantity: z.number().int().min(1).max(20),
  name: z.string().max(200).optional(),
  slug: z.string().max(120).optional(),
  size: z.string().max(20).optional(),
  frame: z.string().max(40).optional(),
  image: z.string().max(600).optional(),
});

const createInput = z.object({
  items: z.array(orderItemSchema).min(1).max(20),
  customer: checkoutSchema, // reuse the strict checkout schema for customer + address
  paymentMethod: z.enum(["cod", "prepaid"]),
  paymentId: z.string().max(120).optional(),
  razorpayOrderId: z.string().max(120).optional(),
  razorpaySignature: z.string().max(200).optional(),
  couponCode: z.string().max(40).optional(),
  utm_source: z.string().max(80).optional(),
  utm_medium: z.string().max(80).optional(),
  utm_campaign: z.string().max(80).optional(),
});

const SIZE_WEIGHTS: Record<string, number> = {
  XS: 0.6, S: 1.2, M: 2.0, L: 3.5,
  A4: 0.3, Small: 1.2, Medium: 2.0, Large: 3.5, XL: 6.0,
};

export const createOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data }) => {
    const { hasSupabase, getSupabase, generateOrderId, getConfigs } = await import("./supabase.server");
    const c = data.customer;
    const address = {
      name: c.fullName,
      line1: c.addressLine1,
      line2: c.addressLine2 || "",
      city: c.city,
      state: c.state,
      pincode: c.pincode,
    };

    // Build order items + subtotal (from DB prices when available).
    let subtotal = 0;
    const orderItems: any[] = [];
    let largestSize = "S";
    const sizeOrder = ["XS", "A4", "S", "Small", "M", "Medium", "L", "Large", "XL"];

    const sb = hasSupabase() ? getSupabase() : null;
    for (const item of data.items) {
      let price = item.price;
      let name = item.name || "Custom Photo Frame";
      let sku = "CUSTOM";
      if (sb && !item.variantId.startsWith("custom-") && !item.variantId.includes("-direct")) {
        const { data: v } = await sb
          .from("product_variants").select("*, product:products(name, slug)").eq("id", item.variantId).single();
        if (v) {
          price = (v as any).price;
          name = (v as any).product?.name || name;
          sku = (v as any).sku || sku;
        }
      }
      subtotal += price * item.quantity;
      if (sizeOrder.indexOf(item.size || "S") > sizeOrder.indexOf(largestSize)) largestSize = item.size || "S";
      orderItems.push({
        variant_id: item.variantId,
        name,
        slug: item.slug || "",
        size: item.size || "S",
        frame_type: item.frame || "Direct Frame",
        price,
        sku,
        quantity: item.quantity,
        image_url: item.image || "",
      });
    }

    const config = hasSupabase()
      ? await getConfigs(["free_shipping_threshold", "cod_fee", "pickup_pincode"])
      : {};
    const freeThreshold = parseInt(config.free_shipping_threshold || "999");

    // Shipping via Shiprocket (best effort).
    const { checkServiceability, calculateShipping } = await import("./shipping.server");
    let shiprocketRate: number | null = null;
    try {
      const weight = orderItems.reduce((s, it) => s + (SIZE_WEIGHTS[it.size] || 2.0) * it.quantity, 0);
      const srv = await checkServiceability({
        pickupPincode: config.pickup_pincode || process.env.PICKUP_PINCODE || "501504",
        deliveryPincode: address.pincode,
        weight,
        cod: data.paymentMethod === "cod",
        declaredValue: subtotal,
        length: 55, breadth: 45, height: 5,
      });
      if (srv?.available) shiprocketRate = srv.shippingCharge;
    } catch { /* non-fatal */ }

    const shippingCharge = calculateShipping(shiprocketRate, data.paymentMethod, subtotal, freeThreshold);
    const codFee = data.paymentMethod === "cod" ? parseInt(config.cod_fee || "49") : 0;

    // Coupon.
    let couponDiscount = 0;
    let validatedCoupon: any = null;
    if (data.couponCode && sb) {
      const { validateCoupon } = await import("./coupons.server");
      const res = await validateCoupon(sb, data.couponCode, subtotal);
      if (!res.valid) return { ok: false as const, error: res.error || "Invalid coupon" };
      couponDiscount = res.discount;
      validatedCoupon = res.coupon;
    }

    const total = subtotal + shippingCharge + codFee - couponDiscount;

    // No DB: return a computed summary + WhatsApp fallback (still functional).
    const waNumber = process.env.WHATSAPP_NUMBER || "91XXXXXXXXXX";
    if (!sb) {
      const orderId = `PS-LOCAL-${Date.now().toString(36).toUpperCase()}`;
      const waMessage = `New order ${orderId} — Total Rs.${total}`;
      return {
        ok: true as const,
        orderId,
        total,
        subtotal,
        shippingCharge,
        codFee,
        discount: couponDiscount,
        whatsappUrl: `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`,
        persisted: false,
      };
    }

    const orderId = await generateOrderId();
    let { data: customer } = await sb.from("customers").select("id").eq("email", c.email).single();
    if (!customer) {
      const { data: nc } = await sb.from("customers")
        .insert({ email: c.email, name: c.fullName, phone: c.phone }).select("id").single();
      customer = nc as any;
    }

    const orderData: any = {
      order_id: orderId,
      customer_id: (customer as any)?.id,
      customer_name: c.fullName,
      customer_phone: c.phone,
      customer_email: c.email,
      address,
      items: orderItems,
      subtotal,
      shipping_charge: shippingCharge,
      cod_fee: codFee,
      discount: couponDiscount,
      coupon_code: data.couponCode?.toUpperCase() || null,
      total,
      payment_method: data.paymentMethod,
      payment_id: data.paymentId || null,
      razorpay_order_id: data.razorpayOrderId || null,
      razorpay_signature: data.razorpaySignature || null,
      status: data.paymentMethod === "cod" ? "cod_pending" : "pending",
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
    };

    const { data: order, error } = await sb.from("orders").insert(orderData).select().single();
    if (error) return { ok: false as const, error: error.message };

    if (validatedCoupon) {
      const { incrementCouponUsage } = await import("./coupons.server");
      await incrementCouponUsage(sb, validatedCoupon.id, validatedCoupon.usage_count);
    }

    const waMessage = `Order ${orderId} — Total Rs.${total}`;
    const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

    // Emails + Shiprocket for COD (prepaid handled in verifyPaymentFn).
    try {
      const { sendEmail, sendOwnerAlert } = await import("./email.server");
      const { codConfirmationEmail, orderConfirmationEmail, ownerNewOrderAlert } = await import("./email-templates");
      if (data.paymentMethod === "cod") {
        await sendEmail({
          to: c.email,
          subject: `COD Order Received — Confirm Within 24h | ${orderId}`,
          html: codConfirmationEmail(orderData, whatsappUrl),
          orderId,
          type: "cod_confirmation",
        });
        const { createShiprocketOrder } = await import("./shipping.server");
        const sync = await createShiprocketOrder({ ...orderData, id: (order as any).id });
        if (sync.success && sync.shiprocketOrderIds) {
          await sb.from("orders").update({
            shiprocket_synced: true,
            shiprocket_order_id: sync.shiprocketOrderIds.join(","),
          }).eq("order_id", orderId);
        }
      } else {
        await sendEmail({
          to: c.email,
          subject: `Order Confirmed! | ${orderId}`,
          html: orderConfirmationEmail(orderData),
          orderId,
          type: "order_confirmation",
        });
      }
      await sendOwnerAlert(
        `New ${data.paymentMethod.toUpperCase()} Order: ${orderId} | Rs.${total}`,
        ownerNewOrderAlert(orderData, whatsappUrl),
      );
    } catch (e) {
      console.error("order email/sync failed", e);
    }

    return {
      ok: true as const,
      orderId,
      total,
      subtotal,
      shippingCharge,
      codFee,
      discount: couponDiscount,
      whatsappUrl,
      persisted: true,
    };
  });

const trackInput = z.object({
  orderId: z.string().max(60).optional(),
  phone: z.string().max(15).optional(),
});

export const trackOrderFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => trackInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { hasSupabase, getSupabase } = await import("./supabase.server");
    if (!hasSupabase()) return { ok: false as const, error: "Order tracking is temporarily unavailable." };
    if (!data.orderId && !data.phone) return { ok: false as const, error: "Provide order_id or phone" };
    const sb = getSupabase();
    const cols = "order_id, status, items, total, shipping_charge, payment_method, awb_number, carrier, carrier_tracking_url, created_at, updated_at, address";
    try {
      if (data.orderId) {
        const { data: row, error } = await sb.from("orders").select(cols).eq("order_id", data.orderId).single();
        if (error || !row) return { ok: false as const, error: "Order not found" };
        return { ok: true as const, orders: [row] };
      }
      const { data: rows } = await sb.from("orders").select(cols)
        .eq("customer_phone", data.phone!).order("created_at", { ascending: false }).limit(5);
      return { ok: true as const, orders: rows || [] };
    } catch (e: any) {
      return { ok: false as const, error: "Failed to fetch order" };
    }
  });
