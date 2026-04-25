// PhotoFrameIn - Email Templates

export function orderConfirmationEmail(order: any): string {
  const items = order.items.map((item: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #333;">${item.name}</td>
      <td style="padding:8px;border-bottom:1px solid #333;">${item.size} / ${item.frame_type}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right;">Rs.${item.price}</td>
    </tr>
  `).join('');

  return `
    <div style="max-width:600px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;font-family:Arial,sans-serif;">
      <div style="background:#1A1A1A;padding:24px;text-align:center;border-bottom:2px solid #FFD700;">
        <h1 style="color:#FFD700;margin:0;font-size:24px;">PhotoFrameIn</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#FFD700;margin-top:0;">Order Confirmed!</h2>
        <p>Thank you for your order, <strong>${order.customer_name}</strong>!</p>
        <div style="background:#1A1A1A;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Order ID:</strong> ${order.order_id}</p>
          <p style="margin:4px 0;"><strong>Payment:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}</p>
          <p style="margin:4px 0;"><strong>Estimated Delivery:</strong> 3-5 business days</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="border-bottom:2px solid #FFD700;">
              <th style="padding:8px;text-align:left;color:#FFD700;">Item</th>
              <th style="padding:8px;text-align:left;color:#FFD700;">Variant</th>
              <th style="padding:8px;text-align:right;color:#FFD700;">Price</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>
        <div style="text-align:right;margin:16px 0;">
          ${order.shipping_charge ? `<p style="margin:4px 0;">Shipping: Rs.${order.shipping_charge}</p>` : '<p style="margin:4px 0;color:#22C55E;">Shipping: FREE</p>'}
          ${order.cod_fee ? `<p style="margin:4px 0;">COD Fee: Rs.${order.cod_fee}</p>` : ''}
          ${order.discount ? `<p style="margin:4px 0;color:#22C55E;">Discount: -Rs.${order.discount}</p>` : ''}
          <p style="margin:8px 0;font-size:18px;color:#FFD700;"><strong>Total: Rs.${order.total}</strong></p>
        </div>
        <div style="background:#1A1A1A;border-radius:8px;padding:16px;margin:16px 0;">
          <h3 style="color:#FFD700;margin-top:0;">Delivery Address</h3>
          <p style="margin:4px 0;">${order.address.name}</p>
          <p style="margin:4px 0;">${order.address.line1}</p>
          ${order.address.line2 ? `<p style="margin:4px 0;">${order.address.line2}</p>` : ''}
          <p style="margin:4px 0;">${order.address.city}, ${order.address.state} - ${order.address.pincode}</p>
        </div>
        <div style="background:#CC000020;border:1px solid #CC0000;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;"><strong>Important:</strong> Please film your unboxing! In the rare case of damage during transit, an unboxing video is required for free replacement.</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://photoframein.com/track?order=${order.order_id}" style="background:#CC0000;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Track Your Order</a>
        </div>
      </div>
      <div style="background:#1A1A1A;padding:16px;text-align:center;font-size:12px;color:#888;">
        <p>PhotoFrameIn | Premium Wall Art & Photo Frames</p>
        <p><a href="https://photoframein.com/policy#returns" style="color:#FFD700;">Returns Policy</a> | <a href="https://photoframein.com/policy#shipping" style="color:#FFD700;">Shipping Policy</a></p>
      </div>
    </div>
  `;
}

export function codConfirmationEmail(order: any, whatsappUrl: string): string {
  return `
    <div style="max-width:600px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;font-family:Arial,sans-serif;">
      <div style="background:#1A1A1A;padding:24px;text-align:center;border-bottom:2px solid #FFD700;">
        <h1 style="color:#FFD700;margin:0;font-size:24px;">PhotoFrameIn</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#E8670A;margin-top:0;">COD Order Received — Confirm Within 24 Hours</h2>
        <p>Hi <strong>${order.customer_name}</strong>,</p>
        <p>Your COD order <strong>${order.order_id}</strong> for <strong>Rs.${order.total}</strong> has been received.</p>
        <div style="background:#E8670A20;border:1px solid #E8670A;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;"><strong>Action Required:</strong> Please confirm your order via WhatsApp within 24 hours. Unconfirmed orders are automatically cancelled.</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${whatsappUrl}" style="background:#25D366;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Confirm on WhatsApp</a>
        </div>
        <p style="font-size:13px;color:#888;">COD Fee: Rs.${order.cod_fee || 49} (non-refundable)</p>
      </div>
    </div>
  `;
}

export function shippedEmail(order: any, trackingUrl: string): string {
  return `
    <div style="max-width:600px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;font-family:Arial,sans-serif;">
      <div style="background:#1A1A1A;padding:24px;text-align:center;border-bottom:2px solid #FFD700;">
        <h1 style="color:#FFD700;margin:0;font-size:24px;">PhotoFrameIn</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#22C55E;margin-top:0;">Your Order Has Been Shipped!</h2>
        <p>Great news, <strong>${order.customer_name}</strong>! Your order is on its way.</p>
        <div style="background:#1A1A1A;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Order ID:</strong> ${order.order_id}</p>
          <p style="margin:4px 0;"><strong>AWB:</strong> ${order.awb_number}</p>
          <p style="margin:4px 0;"><strong>Carrier:</strong> ${order.carrier}</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${trackingUrl}" style="background:#CC0000;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Track Your Order</a>
        </div>
        <div style="background:#CC000020;border:1px solid #CC0000;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;"><strong>Reminder:</strong> Please film your unboxing from start to finish. In case of any damage, an unboxing video is required for a free replacement.</p>
        </div>
      </div>
    </div>
  `;
}

export function cancellationEmail(order: any, refundAmount?: number): string {
  return `
    <div style="max-width:600px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;font-family:Arial,sans-serif;">
      <div style="background:#1A1A1A;padding:24px;text-align:center;border-bottom:2px solid #FFD700;">
        <h1 style="color:#FFD700;margin:0;font-size:24px;">PhotoFrameIn</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#CC0000;margin-top:0;">Order Cancelled</h2>
        <p>Hi <strong>${order.customer_name}</strong>,</p>
        <p>Your order <strong>${order.order_id}</strong> has been cancelled.</p>
        ${refundAmount ? `
          <div style="background:#1A1A1A;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Refund Amount:</strong> Rs.${refundAmount}</p>
            <p style="margin:4px 0;"><strong>Timeline:</strong> 5-7 business days to original payment method</p>
          </div>
        ` : ''}
        <div style="text-align:center;margin:24px 0;">
          <a href="https://photoframein.com/shop" style="background:#CC0000;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Continue Shopping</a>
        </div>
      </div>
    </div>
  `;
}

export function reviewRequestEmail(order: any): string {
  return `
    <div style="max-width:600px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;font-family:Arial,sans-serif;">
      <div style="background:#1A1A1A;padding:24px;text-align:center;border-bottom:2px solid #FFD700;">
        <h1 style="color:#FFD700;margin:0;font-size:24px;">PhotoFrameIn</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#FFD700;margin-top:0;">Love Your New Wall Art?</h2>
        <p>Hi <strong>${order.customer_name}</strong>,</p>
        <p>We hope you are enjoying your new wall art! We would love to hear your thoughts.</p>
        <div style="background:#FFD70020;border:1px solid #FFD700;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;"><strong>Get Rs.100 off</strong> your next order when you leave a review!</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://photoframein.com/review?order=${order.order_id}" style="background:#FFD700;color:#0D0D0D;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Write a Review</a>
        </div>
      </div>
    </div>
  `;
}

export function ownerNewOrderAlert(order: any, whatsappUrl: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2>New ${order.payment_method === 'cod' ? 'COD' : 'Prepaid'} Order: ${order.order_id}</h2>
      <p><strong>Customer:</strong> ${order.customer_name} (${order.customer_phone})</p>
      <p><strong>Total:</strong> Rs.${order.total}</p>
      <p><strong>Items:</strong> ${order.items.map((i: any) => `${i.name} (${i.size}/${i.frame_type})`).join(', ')}</p>
      <p><strong>Address:</strong> ${order.address.city}, ${order.address.state} - ${order.address.pincode}</p>
      ${order.payment_method === 'cod' ? `<p><a href="${whatsappUrl}">Confirm via WhatsApp</a></p>` : ''}
    </div>
  `;
}

export function damageClaimAlert(claim: any): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2>Damage Claim Submitted: ${claim.order_id}</h2>
      <p><strong>Description:</strong> ${claim.description}</p>
      <p><strong>Video:</strong> <a href="${claim.video_url}">Watch Video</a></p>
      <p>
        <a href="https://photoframein.com/admin/orders?claim=${claim.id}" style="background:#22C55E;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;">Approve Replacement</a>
        &nbsp;
        <a href="https://photoframein.com/admin/orders?decline=${claim.id}" style="background:#CC0000;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;">Decline</a>
      </p>
    </div>
  `;
}
