// ChitraFrame - Email Templates

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
        <h1 style="color:#FFD700;margin:0;font-size:24px;">ChitraFrame</h1>
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
          <a href="https://frame-it.pages.dev/track?order=${order.order_id}" style="background:#CC0000;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Track Your Order</a>
        </div>
      </div>
      <div style="background:#1A1A1A;padding:16px;text-align:center;font-size:12px;color:#888;">
        <p>ChitraFrame | Premium Wall Art & Photo Frames</p>
        <p><a href="https://frame-it.pages.dev/policy#returns" style="color:#FFD700;">Returns Policy</a> | <a href="https://frame-it.pages.dev/policy#shipping" style="color:#FFD700;">Shipping Policy</a></p>
      </div>
    </div>
  `;
}

export function codConfirmationEmail(order: any, whatsappUrl: string): string {
  return `
    <div style="max-width:600px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;font-family:Arial,sans-serif;">
      <div style="background:#1A1A1A;padding:24px;text-align:center;border-bottom:2px solid #FFD700;">
        <h1 style="color:#FFD700;margin:0;font-size:24px;">ChitraFrame</h1>
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
        <h1 style="color:#FFD700;margin:0;font-size:24px;">ChitraFrame</h1>
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
        <h1 style="color:#FFD700;margin:0;font-size:24px;">ChitraFrame</h1>
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
          <a href="https://frame-it.pages.dev/shop" style="background:#CC0000;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Continue Shopping</a>
        </div>
      </div>
    </div>
  `;
}

export function reviewRequestEmail(order: any): string {
  return `
    <div style="max-width:600px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;font-family:Arial,sans-serif;">
      <div style="background:#1A1A1A;padding:24px;text-align:center;border-bottom:2px solid #FFD700;">
        <h1 style="color:#FFD700;margin:0;font-size:24px;">ChitraFrame</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#FFD700;margin-top:0;">Love Your New Wall Art?</h2>
        <p>Hi <strong>${order.customer_name}</strong>,</p>
        <p>We hope you are enjoying your new wall art! We would love to hear your thoughts.</p>
        <div style="background:#FFD70020;border:1px solid #FFD700;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;"><strong>Get Rs.100 off</strong> your next order when you leave a review!</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://frame-it.pages.dev/review?order=${order.order_id}" style="background:#FFD700;color:#0D0D0D;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Write a Review</a>
        </div>
      </div>
    </div>
  `;
}

export function ownerNewOrderAlert(order: any, whatsappUrl: string): string {
  const isCod = order.payment_method === 'cod';
  const payBadge = isCod
    ? `<span style="background:#E8670A;color:#fff;padding:3px 10px;border-radius:4px;font-size:13px;font-weight:700;">COD</span>`
    : `<span style="background:#22C55E;color:#fff;padding:3px 10px;border-radius:4px;font-size:13px;font-weight:700;">PREPAID ✓</span>`;

  // Build items table with image download links
  const itemsRows = (order.items || []).map((item: any) => {
    const hasImage = item.image_url && (item.image_url.startsWith('http') || item.image_url.startsWith('data:'));
    const downloadBtn = hasImage && !item.image_url.startsWith('data:')
      ? `<a href="${item.image_url}" download style="background:#C5A059;color:#000;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;text-decoration:none;">⬇ Download Image</a>`
      : item.image_url?.startsWith('data:')
        ? `<span style="color:#E8670A;font-size:11px;">Base64 — upload to Cloudinary first</span>`
        : `<span style="color:#888;font-size:11px;">No image (catalog product)</span>`;
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #333;font-size:13px;">
          ${item.image_url && !item.image_url.startsWith('data:') ? `<img src="${item.image_url}" style="width:52px;height:52px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:8px;" />` : ''}
          <strong>${item.name}</strong><br>
          <span style="color:#aaa;font-size:11px;">${item.size} / ${item.frame_type} × ${item.quantity}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #333;font-size:13px;">₹${item.price * item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #333;">${downloadBtn}</td>
      </tr>`;
  }).join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#111;color:#eee;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <div style="background:#C5A059;padding:20px 28px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#000;">🖼️ ChitraFrame</div>
          <div style="font-size:13px;color:#333;margin-top:2px;">New Order Alert</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:22px;font-weight:900;color:#000;">${order.order_id}</div>
          <div style="margin-top:4px;">${payBadge}</div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:24px 28px;">
        <!-- Customer -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:6px 0;color:#aaa;font-size:12px;width:140px;">Customer</td>
            <td style="padding:6px 0;font-size:14px;font-weight:600;">${order.customer_name}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#aaa;font-size:12px;">Phone</td>
            <td style="padding:6px 0;font-size:14px;"><a href="tel:${order.customer_phone}" style="color:#C5A059;">${order.customer_phone}</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#aaa;font-size:12px;">Email</td>
            <td style="padding:6px 0;font-size:13px;"><a href="mailto:${order.customer_email}" style="color:#C5A059;">${order.customer_email}</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#aaa;font-size:12px;">Ship To</td>
            <td style="padding:6px 0;font-size:13px;">${order.address?.line1 || ''}, ${order.address?.city}, ${order.address?.state} — ${order.address?.pincode}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#aaa;font-size:12px;">Total</td>
            <td style="padding:6px 0;font-size:18px;font-weight:800;color:#C5A059;">₹${order.total?.toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <!-- Items with download links -->
        <h3 style="font-size:13px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Order Items & Image Downloads</h3>
        <table style="width:100%;border-collapse:collapse;background:#1a1a1a;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#222;">
              <th style="padding:8px;text-align:left;font-size:11px;color:#888;">Product</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#888;">Price</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#888;">Print Image</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <!-- Action Buttons -->
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          ${isCod ? `<a href="${whatsappUrl}" style="background:#25D366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">📱 Confirm via WhatsApp</a>` : ''}
          <a href="https://photoframepfs.pages.dev/admin" style="background:#C5A059;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">🔧 Open Admin Panel</a>
        </div>

        ${isCod ? `<p style="margin-top:16px;padding:12px;background:#E8670A22;border:1px solid #E8670A44;border-radius:8px;font-size:13px;color:#E8670A;"><strong>⚠️ Action Required:</strong> Confirm this COD order via WhatsApp within 24 hours or it will be auto-cancelled.</p>` : ''}
      </div>
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
        <a href="https://frame-it.pages.dev/admin/orders?claim=${claim.id}" style="background:#22C55E;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;">Approve Replacement</a>
        &nbsp;
        <a href="https://frame-it.pages.dev/admin/orders?decline=${claim.id}" style="background:#CC0000;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;">Decline</a>
      </p>
    </div>
  `;
}
