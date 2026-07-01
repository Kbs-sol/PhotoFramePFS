// Server-only shared coupon validation. Ported from PhotoFramePFS.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  coupon?: any;
  error?: string;
}

/**
 * Validate a coupon code and compute its discount. Does NOT increment usage —
 * call incrementCouponUsage() after the order commits.
 */
export async function validateCoupon(
  sb: SupabaseClient,
  code: string,
  subtotal: number,
  customerId?: string,
): Promise<CouponValidationResult> {
  if (!code?.trim()) return { valid: false, discount: 0, error: "No coupon code provided" };

  const { data: coupon, error } = await sb
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("is_active", true)
    .single();

  if (error || !coupon) return { valid: false, discount: 0, error: "Invalid coupon code" };

  if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
    return { valid: false, discount: 0, error: "Coupon expired" };
  }
  if (coupon.total_limit && coupon.usage_count >= coupon.total_limit) {
    return { valid: false, discount: 0, error: "Coupon usage limit reached" };
  }
  if (subtotal < (coupon.min_subtotal || 0)) {
    return {
      valid: false,
      discount: 0,
      error: `Minimum order Rs.${coupon.min_subtotal} required for this coupon`,
    };
  }
  if (customerId && coupon.per_user_limit) {
    const { count } = await sb
      .from("coupon_usage")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("customer_id", customerId);
    if ((count || 0) >= coupon.per_user_limit) {
      return {
        valid: false,
        discount: 0,
        error: "You have already used this coupon the maximum number of times",
      };
    }
  }

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = Math.floor((subtotal * coupon.value) / 100);
    if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
  } else {
    discount = Math.min(coupon.value, subtotal);
  }

  return { valid: true, discount, coupon };
}

export async function incrementCouponUsage(
  sb: SupabaseClient,
  couponId: string,
  currentCount: number,
): Promise<void> {
  await sb
    .from("coupons")
    .update({ usage_count: currentCount + 1 })
    .eq("id", couponId);
}
