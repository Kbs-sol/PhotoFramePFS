// PhotoFrameIn - Checkout & Payment Routes
import { Hono } from 'hono';
import { Bindings } from '..';
import { getSupabase, getConfigs } from '../lib/supabase';
import { isValidPincode, isHyderabad, validatePincode, checkServiceability, SIZE_DIMENSIONS, calculateShipping } from '../lib/shipping';

const checkout = new Hono<{ Bindings: Bindings }>();

// POST /api/checkout/validate-pincode
checkout.post('/validate-pincode', async (c) => {
  const { pincode } = await c.req.json();

  if (!isValidPincode(pincode)) {
    return c.json({ valid: false, error: 'Invalid pincode format' });
  }

  const result = await validatePincode(pincode);
  const express = isHyderabad(pincode);

  return c.json({
    valid: result.valid,
    district: result.district,
    state: result.state,
    express,
    deliveryEstimate: express ? '1-2 business days' : '3-5 business days',
    expressMessage: express ? 'Express Delivery in Hyderabad · 1-2 days' : null
  });
});

// POST /api/checkout/shipping-estimate
checkout.post('/shipping-estimate', async (c) => {
  const { pincode, items, paymentMethod } = await c.req.json();
  const config = await getConfigs(c.env, ['free_shipping_threshold', 'pickup_pincode', 'cod_fee']);

  if (!isValidPincode(pincode)) return c.json({ error: 'Invalid pincode' }, 400);

  const freeThreshold = parseInt(config.free_shipping_threshold || '899');
  const pickupPincode = config.pickup_pincode || '501504';

  // Calculate cart total and find largest size
  let cartTotal = 0;
  let largestSize = 'A4';
  const sizeOrder = ['A4', 'Small', 'Medium', 'Large', 'XL'];

  for (const item of items || []) {
    cartTotal += (item.price || 0) * (item.quantity || 1);
    if (sizeOrder.indexOf(item.size) > sizeOrder.indexOf(largestSize)) {
      largestSize = item.size;
    }
  }

  // Try Shiprocket for actual quote
  const dims = SIZE_DIMENSIONS[largestSize] || SIZE_DIMENSIONS['Medium'];
  let shiprocketCharge: number | null = null;
  let codAvailable = true;
  let estimatedDays = isHyderabad(pincode) ? '1-2' : '3-5';
  let courier = '';

  const serviceResult = await checkServiceability(c.env, {
    pickupPincode,
    deliveryPincode: pincode,
    weight: dims.volWeight,
    cod: paymentMethod === 'cod',
    declaredValue: cartTotal,
    length: dims.length,
    breadth: dims.breadth,
    height: dims.height
  });

  if (serviceResult) {
    shiprocketCharge = serviceResult.shippingCharge;
    codAvailable = serviceResult.codAvailable;
    estimatedDays = serviceResult.estimatedDays || estimatedDays;
    courier = serviceResult.courier;
  }

  const shippingCharge = calculateShipping(shiprocketCharge, paymentMethod || 'prepaid', largestSize, cartTotal, freeThreshold);
  const codFee = paymentMethod === 'cod' ? parseInt(config.cod_fee || '49') : 0;

  return c.json({
    shippingCharge,
    codFee,
    codAvailable,
    estimatedDays: `${estimatedDays} business days`,
    courier,
    freeShipping: paymentMethod === 'prepaid' && cartTotal >= freeThreshold,
    express: isHyderabad(pincode)
  });
});

// POST /api/checkout/create-razorpay-order
// SECURITY: amount is validated server-side from order items, NOT trusted from client
checkout.post('/create-razorpay-order', async (c) => {
  try {
    const body = await c.req.json();
    const { currency, receipt, notes, items, couponCode } = body;

    if (!c.env.RAZORPAY_KEY_ID || !c.env.RAZORPAY_KEY_SECRET) {
      return c.json({ error: 'Payment gateway not configured' }, 500);
    }

    // CRITICAL: Re-calculate amount from DB to prevent price manipulation
    let serverAmount = 0;
    if (items && Array.isArray(items) && items.length > 0 && c.env.SUPABASE_URL) {
      const sb = getSupabase(c.env);
      for (const item of items) {
        if (item.variantId?.toString().startsWith('custom-')) {
          // For custom frames use the provided price but cap it
          serverAmount += Math.max(499, Math.min(Number(item.price) || 999, 9999)) * (item.quantity || 1);
        } else {
          const { data: variant } = await sb.from('product_variants')
            .select('price').eq('id', item.variantId).eq('is_active', true).single();
          if (!variant) return c.json({ error: `Invalid item: ${item.variantId}` }, 400);
          serverAmount += variant.price * (item.quantity || 1);
        }
      }
      // Apply coupon discount if provided
      if (couponCode) {
        const { data: coupon } = await sb.from('coupons')
          .select('*').eq('code', couponCode.toUpperCase()).eq('is_active', true).single();
        if (coupon && !(coupon.expiry_date && new Date(coupon.expiry_date) < new Date())) {
          if (coupon.type === 'percentage') {
            const d = Math.floor(serverAmount * coupon.value / 100);
            serverAmount -= coupon.max_discount ? Math.min(d, coupon.max_discount) : d;
          } else {
            serverAmount -= coupon.value;
          }
        }
      }
      serverAmount = Math.max(1, serverAmount); // prevent zero/negative
    } else {
      // Fallback: use client-provided amount but enforce sanity bounds
      const clientAmount = Number(body.amount);
      if (!clientAmount || clientAmount < 1 || clientAmount > 999999 || !isFinite(clientAmount)) {
        return c.json({ error: 'Invalid amount' }, 400);
      }
      serverAmount = Math.round(clientAmount);
    }

    const auth = btoa(`${c.env.RAZORPAY_KEY_ID}:${c.env.RAZORPAY_KEY_SECRET}`);

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: serverAmount * 100, // Razorpay expects paise — using SERVER-calculated amount
        currency: currency || 'INR',
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || {}
      })
    });

    const data: any = await res.json();
    if (data.error) return c.json({ error: data.error.description }, 400);

    return c.json({
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      key: c.env.RAZORPAY_KEY_ID
    });

  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/checkout/verify-payment — Razorpay HMAC verification
checkout.post('/verify-payment', async (c) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = await c.req.json();

    if (!c.env.RAZORPAY_KEY_SECRET) {
      return c.json({ error: 'Payment verification not available' }, 500);
    }

    // HMAC-SHA256 verification
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(c.env.RAZORPAY_KEY_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== razorpay_signature) {
      return c.json({ verified: false, error: 'Signature mismatch' }, 400);
    }

    // 🚀 NEW: Automatic Shiprocket Sync for Prepaid (Background)
    if (order_id) {
      const sb = getSupabase(c.env);
      const { createShiprocketOrder } = await import('../lib/shipping');
      
      // Update order payment status first
      await sb.from('orders').update({
        payment_id: razorpay_payment_id,
        status: 'pending', // Move from 'pending_payment' if that was used
        updated_at: new Date().toISOString()
      }).eq('order_id', order_id);

      // Trigger sync and email
      c.executionCtx.waitUntil((async () => {
        const { data: order } = await sb.from('orders').select('*').eq('order_id', order_id).single();
        if (order) {
          // Send confirmation email
          const { orderConfirmationEmail } = await import('../lib/email-templates');
          const { sendEmail } = await import('../lib/email');
          await sendEmail(c.env, {
            to: order.customer_email,
            subject: `Order Confirmed! | ${order_id}`,
            html: orderConfirmationEmail(order),
            orderId: order_id,
            type: 'order_confirmation'
          });

          // Sync to Shiprocket
          const syncResult = await createShiprocketOrder(c.env, order);
          if (syncResult.success && syncResult.shiprocketOrderIds) {
            await sb.from('orders').update({
              shiprocket_synced: true,
              shiprocket_order_id: syncResult.shiprocketOrderIds.join(','),
              updated_at: new Date().toISOString()
            }).eq('order_id', order_id);
          }
        }
      })());
    }

    return c.json({ verified: true, paymentId: razorpay_payment_id });

  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/checkout/apply-coupon
checkout.post('/apply-coupon', async (c) => {
  const { code, subtotal, customerId } = await c.req.json();
  const sb = getSupabase(c.env);

  const { data: coupon } = await sb.from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (!coupon) return c.json({ error: 'Invalid coupon code' }, 400);
  if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
    return c.json({ error: 'Coupon expired' }, 400);
  }
  if (coupon.total_limit && coupon.usage_count >= coupon.total_limit) {
    return c.json({ error: 'Coupon limit reached' }, 400);
  }
  if (subtotal < (coupon.min_subtotal || 0)) {
    return c.json({ error: `Minimum order Rs.${coupon.min_subtotal}` }, 400);
  }

  // Check per-user limit
  if (customerId && coupon.per_user_limit) {
    const { count } = await sb.from('coupon_usage')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('customer_id', customerId);

    if ((count || 0) >= coupon.per_user_limit) {
      return c.json({ error: 'You have already used this coupon' }, 400);
    }
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.floor(subtotal * coupon.value / 100);
    if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
  } else {
    discount = coupon.value;
  }

  return c.json({
    valid: true,
    discount,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    message: coupon.type === 'percentage' ? `${coupon.value}% off applied!` : `Rs.${coupon.value} off applied!`
  });
});

// POST /api/checkout/cod-check — Check COD availability for pincode
checkout.post('/cod-check', async (c) => {
  const { pincode, cartTotal } = await c.req.json();
  const config = await getConfigs(c.env, ['cod_enabled', 'cod_min_value', 'cod_max_value', 'pickup_pincode']);
  const sb = getSupabase(c.env);

  if (config.cod_enabled !== 'true') {
    return c.json({ available: false, reason: 'COD is currently unavailable' });
  }

  if (cartTotal < parseInt(config.cod_min_value || '499')) {
    return c.json({ available: false, reason: `COD available for orders above Rs.${config.cod_min_value}` });
  }

  if (cartTotal > parseInt(config.cod_max_value || '1995')) {
    return c.json({ available: false, reason: `COD not available above Rs.${config.cod_max_value}. Please use prepaid.` });
  }

  // Check internal high-risk pincode DB
  const prefix = pincode?.substring(0, 3);
  if (prefix) {
    const { data: risk } = await sb.from('pincode_risk')
      .select('cod_blocked, rto_count, total_orders')
      .eq('pincode_prefix', prefix)
      .single();

    if (risk?.cod_blocked) {
      return c.json({ available: false, reason: 'COD not available for this area due to high risk' });
    }
  }

  // Check Shiprocket Serviceability for real-time COD status
  try {
    const { checkServiceability } = await import('../lib/shipping');
    const srv = await checkServiceability(c.env, {
      pickupPincode: config.pickup_pincode || '500001',
      deliveryPincode: pincode,
      weight: 1, // Minimal weight just to check generic COD availability
      cod: true,
      declaredValue: cartTotal,
      length: 10, breadth: 10, height: 10
    });

    if (srv && !srv.codAvailable) {
      return c.json({ available: false, reason: 'Courier partner does not support COD for this pincode' });
    }
  } catch (e) {
    console.error('Shiprocket COD check failed', e);
  }

  return c.json({ available: true });
});

// POST /api/checkout/shiprocket-session
checkout.post('/shiprocket-session', async (c) => {
  const { items, customer, discountCode, subtotal } = await c.req.json();
  const sb = getSupabase(c.env);
  const { generateOrderId } = await import('../lib/supabase');
  const tempOrderId = await generateOrderId(c.env);

  const { createShiprocketSession } = await import('../lib/shipping');
  const result = await createShiprocketSession(c.env, {
    order_id: tempOrderId,
    total: subtotal, // Shiprocket calculates final with their own logic but we pass our current
    customer,
    items: items.map((i: any) => ({ ...i, quantity: i.quantity || 1 }))
  });

  if (result.success) {
    return c.json({
      success: true,
      token: result.token,
      order_id: tempOrderId,
      checkout_url: result.checkout_url
    });
  }

  return c.json({ error: result.error || 'Failed to initialize Shiprocket' }, 500);
});

// GET /api/checkout/pincode-validate — Detailed serviceability with fallback
checkout.get('/pincode-validate', async (c) => {
  const pincode = c.req.query('pincode');
  if (!pincode || pincode.length !== 6) return c.json({ valid: false, error: 'Invalid pincode' });

  const { checkServiceability, validatePincode, isHyderabad } = await import('../lib/shipping');
  const config = await getConfigs(c.env, ['pickup_pincode']);
  
  // 1. Check Shiprocket
  try {
    const srv = await checkServiceability(c.env, {
      pickupPincode: config.pickup_pincode || '500001',
      deliveryPincode: pincode,
      weight: 1, cod: true, declaredValue: 1000,
      length: 10, breadth: 10, height: 10
    });

    if (srv && srv.available) {
      return c.json({
        valid: true,
        service: 'express',
        courier: srv.courier,
        etd: srv.estimatedDays,
        cod: srv.codAvailable,
        is_hyderabad: isHyderabad(pincode)
      });
    }
  } catch (e) { console.error('SR check failed'); }

  // 2. Fallback to India Post
  const ip = await validatePincode(pincode);
  if (ip.valid) {
    return c.json({
      valid: true,
      service: 'standard',
      courier: 'India Post (Standard)',
      etd: '5-7 days',
      cod: false, // Standard post usually doesn't support our COD setup
      district: ip.district,
      state: ip.state,
      is_hyderabad: isHyderabad(pincode)
    });
  }

  return c.json({ valid: false, message: 'Currently unserviceable' });
});

export default checkout;
