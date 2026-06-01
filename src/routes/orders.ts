// PhotoFrameIn - Order API Routes
import { Hono } from 'hono';
import { Bindings } from '..';
import { getSupabase, generateOrderId, getConfigs } from '../lib/supabase';
import { sendEmail, sendOwnerAlert } from '../lib/email';
import { orderConfirmationEmail, codConfirmationEmail, cancellationEmail, ownerNewOrderAlert } from '../lib/email-templates';
import { calculateShipping, isValidPincode, isHyderabad, checkServiceability } from '../lib/shipping';
import { validateCoupon, incrementCouponUsage } from '../lib/coupons';

const orders = new Hono<{ Bindings: Bindings }>();

// POST /api/orders/create — Create a new order
orders.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const sb = getSupabase(c.env);
    const config = await getConfigs(c.env, [
      'cod_enabled', 'cod_min_value', 'cod_max_value', 'cod_fee',
      'free_shipping_threshold', 'checkout_mode', 'prepaid_discount',
      'whatsapp_number', 'whatsapp_prepaid_message', 'whatsapp_cod_message'
    ]);

    const { items, customer, address, paymentMethod, paymentId, razorpayOrderId, razorpaySignature, couponCode, checkoutSource } = body;

    // Validate
    if (!items?.length) return c.json({ error: 'No items in order' }, 400);
    if (!customer?.name || !customer?.email || !customer?.phone) return c.json({ error: 'Customer info required' }, 400);
    if (!address?.line1 || !address?.city || !address?.state || !address?.pincode) return c.json({ error: 'Address required' }, 400);
    if (!isValidPincode(address.pincode)) return c.json({ error: 'Invalid pincode' }, 400);

    // Calculate totals
    let subtotal = 0;
    const orderItems: any[] = [];
    let largestSize = 'Small';
    const sizeOrder = ['A4', 'Small', 'Medium', 'Large', 'XL'];
    let hasCustomFrame = false;

    for (const item of items) {
      let variantData: any;

      if (item.variantId?.toString().startsWith('custom-')) {
        // Virtual variant for user-uploaded photos
        hasCustomFrame = true;
        variantData = {
          id: item.variantId,
          product_id: 'custom-uploaded',
          name: item.name || 'Custom Photo Frame',
          size: item.size || 'Medium',
          frame_type: item.frame || 'Standard',
          price: item.price || 999,
          sku: 'CUSTOM-PHOTO',
          product: { name: 'Custom Photo', slug: 'custom-photo', is_custom_frame: true }
        };
      } else {
        const { data: variant } = await sb.from('product_variants')
          .select('*, product:products(name, slug, is_custom_frame)')
          .eq('id', item.variantId)
          .single();

        if (!variant) return c.json({ error: `Variant not found: ${item.variantId}` }, 400);
        variantData = variant;
      }

      const qty = item.quantity || 1;
      subtotal += variantData.price * qty;

      if (sizeOrder.indexOf(variantData.size) > sizeOrder.indexOf(largestSize)) {
        largestSize = variantData.size;
      }

      if (variantData.product?.is_custom_frame) hasCustomFrame = true;

      orderItems.push({
        variant_id: variantData.id,
        product_id: variantData.product_id,
        name: variantData.product?.name || variantData.name || 'Product',
        slug: variantData.product?.slug || '',
        size: variantData.size,
        frame_type: variantData.frame_type,
        price: variantData.price,
        sku: variantData.sku,
        quantity: qty,
        image_url: item.image || item.image_url || ''
      });
    }

    // COD validation
    if (paymentMethod === 'cod') {
      if (config.cod_enabled !== 'true') return c.json({ error: 'COD is currently disabled' }, 400);
      if (hasCustomFrame) return c.json({ error: 'Custom frames are prepaid only' }, 400);
      if (subtotal < parseInt(config.cod_min_value || '499')) return c.json({ error: `COD minimum is Rs.${config.cod_min_value}` }, 400);
      if (subtotal > parseInt(config.cod_max_value || '1995')) return c.json({ error: `COD not available above Rs.${config.cod_max_value}` }, 400);
    }

    // Shipping charge - Realtime Shiprocket Check
    let shiprocketRate: number | null = null;
    const pickupPincode = config.pickup_pincode || '500001';
    
    try {
      const volWeight = orderItems.reduce((sum, item) => {
        const dims = { A4: 0.1, Small: 1.14, Medium: 2.66, Large: 3.70, XL: 8.80 } as any;
        return sum + (dims[item.size] || 2.66) * (item.quantity || 1);
      }, 0);
      
      const srv = await checkServiceability(c.env, {
        pickupPincode,
        deliveryPincode: address.pincode,
        weight: volWeight,
        cod: paymentMethod === 'cod',
        declaredValue: subtotal,
        length: 50, breadth: 38, height: 7 // Default box for Medium
      });
      
      if (srv && srv.available) {
        shiprocketRate = srv.shippingCharge;
      }
    } catch (e) {
      console.error('Shiprocket serviceability error:', e);
    }

    const freeThreshold = parseInt(config.free_shipping_threshold || '899');
    const shippingCharge = calculateShipping(shiprocketRate, paymentMethod, largestSize, subtotal, freeThreshold);

    // COD fee
    const codFee = paymentMethod === 'cod' ? parseInt(config.cod_fee || '49') : 0;

    // Prepaid discount
    const prepaidDiscount = paymentMethod === 'prepaid' ? parseInt(config.prepaid_discount || '50') : 0;

    // Coupon discount — FIX #7: Uses shared validateCoupon utility (no more duplicated logic)
    let couponDiscount = 0;
    let validatedCoupon: any = null;
    if (couponCode) {
      const couponResult = await validateCoupon(sb, couponCode, subtotal);
      if (!couponResult.valid) {
        return c.json({ error: couponResult.error || 'Invalid coupon' }, 400);
      }
      couponDiscount = couponResult.discount;
      validatedCoupon = couponResult.coupon;
    }

    const totalDiscount = prepaidDiscount + couponDiscount;
    const total = subtotal + shippingCharge + codFee - totalDiscount;

    // Generate order ID
    const orderId = await generateOrderId(c.env);

    // Get or create customer
    let { data: existingCustomer } = await sb.from('customers')
      .select('id')
      .eq('email', customer.email)
      .single();

    if (!existingCustomer) {
      const { data: newCustomer } = await sb.from('customers').insert({
        email: customer.email,
        name: customer.name,
        phone: customer.phone
      }).select('id').single();
      existingCustomer = newCustomer;
    }

    // Create order
    const orderData = {
      order_id: orderId,
      customer_id: existingCustomer?.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      address: {
        name: address.name || customer.name,
        line1: address.line1,
        line2: address.line2 || '',
        city: address.city,
        state: address.state,
        pincode: address.pincode
      },
      items: orderItems,
      subtotal,
      shipping_charge: shippingCharge,
      cod_fee: codFee,
      discount: totalDiscount,
      coupon_code: couponCode?.toUpperCase() || null,
      total,
      payment_method: paymentMethod,
      payment_id: paymentId || null,
      razorpay_order_id: razorpayOrderId || null,
      razorpay_signature: razorpaySignature || null,
      checkout_source: checkoutSource || config.checkout_mode || 'shiprocket',
      status: paymentMethod === 'cod' ? 'cod_pending' : 'pending',
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      volumetric_weight: String(orderItems.reduce((sum: number, item: any) => {
        const dims = { A4: 0.1, Small: 1.14, Medium: 2.66, Large: 3.70, XL: 8.80 } as any;
        return sum + (dims[item.size] || 2.66) * (item.quantity || 1);
      }, 0))
    };

    const { data: order, error } = await sb.from('orders').insert(orderData).select().single();
    if (error) return c.json({ error: error.message }, 500);

    // Increment coupon usage AFTER order is committed to DB (prevents double-counting on retries)
    if (validatedCoupon) {
      await incrementCouponUsage(sb, validatedCoupon.id, validatedCoupon.usage_count);
    }

    // Update customer stats — use RPC for atomic increment; fallback uses DB-side arithmetic
    // FIX #11: Removed client-side arithmetic fallback (race condition); now uses DB coalesce
    if (existingCustomer?.id) {
      try {
        await sb.rpc('increment_customer_stats', {
          p_customer_id: existingCustomer.id,
          p_order_total: total
        });
      } catch (rpcErr) {
        // Safe fallback: use DB-side raw SQL expression to avoid read-modify-write race
        // coalesce ensures NULLs are handled correctly
        await sb.from('customers').update({
          total_orders: sb.sql`COALESCE(total_orders, 0) + 1`,
          total_spend: sb.sql`COALESCE(total_spend, 0) + ${total}`
        }).eq('id', existingCustomer.id);
      }
    }

    // WhatsApp URL
    const waNumber = config.whatsapp_number || '91XXXXXXXXXX';
    const waTemplate = paymentMethod === 'cod' ? config.whatsapp_cod_message : config.whatsapp_prepaid_message;
    const waMessage = (waTemplate || 'Order {order_id}').replace('{order_id}', orderId);
    const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

    // Send emails
    if (paymentMethod === 'cod') {
      await sendEmail(c.env, {
        to: customer.email,
        subject: `COD Order Received — Confirm Within 24h | ${orderId}`,
        html: codConfirmationEmail(orderData, whatsappUrl),
        orderId,
        type: 'cod_confirmation'
      });
    }
    // Note: Prepaid emails are sent after payment verification in checkout.ts

    // Owner alert
    await sendOwnerAlert(c.env, `New ${paymentMethod.toUpperCase()} Order: ${orderId} | Rs.${total}`,
      ownerNewOrderAlert(orderData, whatsappUrl));

    // 🚀 NEW: Automatic Shiprocket Sync for COD (Background)
    if (paymentMethod === 'cod') {
      const { createShiprocketOrder } = await import('../lib/shipping');
      c.executionCtx.waitUntil((async () => {
        const syncResult = await createShiprocketOrder(c.env, { ...orderData, id: order.id });
        if (syncResult.success && syncResult.shiprocketOrderIds) {
          await sb.from('orders').update({
            shiprocket_synced: true,
            shiprocket_order_id: syncResult.shiprocketOrderIds.join(','), // Store all IDs
            updated_at: new Date().toISOString()
          }).eq('order_id', orderId);
        } else {
          console.error(`SR Sync failed for ${orderId}:`, syncResult.error);
          // Optional: log to error_log
          await sb.from('error_log').insert({
            endpoint: 'Shiprocket Auto-Sync',
            method: 'BACKGROUND',
            error_message: `Sync failed for ${orderId}: ${syncResult.error}`,
            stack_trace: 'orders.ts background sync'
          });
        }
      })());
    }

    return c.json({
      success: true,
      orderId,
      total,
      whatsappUrl,
      order: { ...orderData, id: order.id }
    });

  } catch (err: any) {
    const { logError } = await import('../lib/supabase');
    const refId = await logError(c.env, '/api/orders/create', 'POST', err.message, err.stack);
    return c.json({ error: 'Order creation failed', refId }, 500);
  }
});

// POST /api/orders/cancel
orders.post('/cancel', async (c) => {
  try {
    const { orderId, reason } = await c.req.json();
    const sb = getSupabase(c.env);

    const { data: order, error } = await sb.from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !order) return c.json({ error: 'Order not found' }, 404);

    // Verify eligibility
    if (!['pending', 'cod_pending', 'printing'].includes(order.status)) {
      return c.json({ error: 'Not eligible for cancellation', reason: 'Order already processed' }, 400);
    }

    const createdAt = new Date(order.created_at);
    const hoursSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince > 24) {
      return c.json({ error: 'Not eligible', reason: 'Cancellation window (24h) has passed' }, 400);
    }

    // Check custom frame
    const hasCustom = order.items?.some((i: any) => i.is_custom_frame);
    if (hasCustom) {
      return c.json({ error: 'Not eligible', reason: 'Custom frame orders cannot be cancelled' }, 400);
    }

    let refundAmount = 0;
    if (order.payment_method === 'prepaid' && order.payment_id) {
      // Refund = total - 2% gateway fee
      refundAmount = Math.floor(order.total * 0.98);
      // TODO: Call Razorpay refund API when credentials available
    }

    // Update order
    await sb.from('orders').update({
      status: 'cancelled',
      admin_notes: `Cancelled: ${reason}. ${refundAmount ? `Refund: Rs.${refundAmount}` : ''}`,
      updated_at: new Date().toISOString()
    }).eq('order_id', orderId);

    // Send cancellation email
    await sendEmail(c.env, {
      to: order.customer_email,
      subject: `Order Cancelled | ${orderId}`,
      html: cancellationEmail(order, refundAmount || undefined),
      orderId,
      type: 'cancellation'
    });

    return c.json({ success: true, refund_amount: refundAmount });

  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /api/orders/track — Track order
// FIX #3: Added noSupabase guard — previously crashed with 500 when DB unreachable
orders.get('/track', async (c) => {
  // Guard: if Supabase is not configured, return a helpful message instead of 500
  if (!c.env?.SUPABASE_URL) {
    return c.json({ error: 'Order tracking is temporarily unavailable. Please contact support.' }, 503);
  }

  const orderId = c.req.query('order_id');
  const phone = c.req.query('phone');

  if (!orderId && !phone) {
    return c.json({ error: 'Provide order_id or phone' }, 400);
  }

  try {
    const sb = getSupabase(c.env);

    let query = sb.from('orders').select('order_id, status, items, total, shipping_charge, payment_method, awb_number, carrier, carrier_tracking_url, created_at, updated_at, address');

    if (orderId) {
      query = query.eq('order_id', orderId);
    } else if (phone) {
      query = query.eq('customer_phone', phone).order('created_at', { ascending: false }).limit(5);
    }

    const { data, error } = orderId ? await query.single() : await query;
    if (error || !data) return c.json({ error: 'Order not found' }, 404);

    return c.json({ orders: orderId ? [data] : data });
  } catch (err: any) {
    const { logError } = await import('../lib/supabase');
    const refId = await logError(c.env, '/api/orders/track', 'GET', err.message, err.stack);
    return c.json({ error: 'Failed to fetch order', refId }, 500);
  }
});

// POST /api/claims/damage — Submit damage claim
orders.post('/claims/damage', async (c) => {
  try {
    const { orderId, videoUrl, description } = await c.req.json();
    const sb = getSupabase(c.env);

    if (!videoUrl) {
      return c.json({ success: false, reason: 'Video required. Please upload an unboxing video.' }, 400);
    }

    const { data: order } = await sb.from('orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'delivered')
      .single();

    if (!order) return c.json({ error: 'Order not found or not delivered yet' }, 404);

    // Check if already claimed
    const { data: existing } = await sb.from('damage_claims')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existing) return c.json({ error: 'Claim already submitted for this order' }, 400);

    // Create claim
    const { data: claim } = await sb.from('damage_claims').insert({
      order_id: orderId,
      video_url: videoUrl,
      description: description || ''
    }).select().single();

    // Alert owner
    const { damageClaimAlert } = await import('../lib/email-templates');
    await sendOwnerAlert(c.env, `Damage Claim: ${orderId}`, damageClaimAlert({
      order_id: orderId, video_url: videoUrl, description, id: claim?.id
    }));

    return c.json({ success: true, claimId: claim?.id });

  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default orders;
