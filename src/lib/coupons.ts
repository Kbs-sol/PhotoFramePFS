// PhotoFrameIn - Shared Coupon Validation Utility
// Extracted to eliminate duplication between checkout.ts and orders.ts
// Single source of truth for all coupon logic

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  coupon?: any;
  error?: string;
}

/**
 * Validate a coupon code against the DB and calculate its discount.
 * Does NOT increment usage_count — call incrementCouponUsage() separately
 * after the order is confirmed to avoid double-counting on retry.
 *
 * @param sb   - Supabase client (already instantiated)
 * @param code - Coupon code string (will be uppercased internally)
 * @param subtotal - Cart subtotal in Rs. (before coupon)
 * @param customerId - Optional: Customer UUID for per-user limit checks
 */
export async function validateCoupon(
  sb: any,
  code: string,
  subtotal: number,
  customerId?: string
): Promise<CouponValidationResult> {
  if (!code?.trim()) return { valid: false, discount: 0, error: 'No coupon code provided' };

  const { data: coupon, error } = await sb.from('coupons')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !coupon) return { valid: false, discount: 0, error: 'Invalid coupon code' };

  if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
    return { valid: false, discount: 0, error: 'Coupon expired' };
  }

  if (coupon.total_limit && coupon.usage_count >= coupon.total_limit) {
    return { valid: false, discount: 0, error: 'Coupon usage limit reached' };
  }

  if (subtotal < (coupon.min_subtotal || 0)) {
    return { valid: false, discount: 0, error: `Minimum order Rs.${coupon.min_subtotal} required for this coupon` };
  }

  // Per-user limit check (optional — only when customerId is provided)
  if (customerId && coupon.per_user_limit) {
    const { count } = await sb.from('coupon_usage')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('customer_id', customerId);

    if ((count || 0) >= coupon.per_user_limit) {
      return { valid: false, discount: 0, error: 'You have already used this coupon the maximum number of times' };
    }
  }

  // Calculate discount amount
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.floor(subtotal * coupon.value / 100);
    if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
  } else {
    // flat / fixed
    discount = Math.min(coupon.value, subtotal); // never discount more than subtotal
  }

  return {
    valid: true,
    discount,
    coupon,
  };
}

/**
 * Atomically increment a coupon's usage_count.
 * Call this AFTER the order row is successfully committed to DB.
 *
 * @param sb       - Supabase client
 * @param couponId - UUID of the coupon row
 * @param currentCount - Last known usage_count (read during validation)
 *                       Used for optimistic increment — safe for low-concurrency scenarios.
 */
export async function incrementCouponUsage(sb: any, couponId: string, currentCount: number): Promise<void> {
  await sb.from('coupons')
    .update({ usage_count: currentCount + 1 })
    .eq('id', couponId);
}
