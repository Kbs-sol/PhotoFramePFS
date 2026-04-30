# PhotoFrameIn — Third-Party Configuration Guide

This guide explains how to set up and configure the essential third-party services required for PhotoFrameIn.

---

## 1. Razorpay (Payments)

Used for prepaid orders (Credit Card, UPI, NetBanking).

### Setup Steps:
1.  **Account**: Create an account at [razorpay.com](https://razorpay.com).
2.  **Keys**: Go to **Settings > API Keys**.
    *   Generate **Test Keys** for development (`rzp_test_...`).
    *   Generate **Live Keys** for production (`rzp_live_...`).
3.  **Webhook (Optional)**: If you want to handle async payment failures, set a webhook to `https://photoframein.pages.dev/api/checkout/razorpay-webhook`.
    *   **Secret**: Set a random string and add as `RAZORPAY_WEBHOOK_SECRET` secret.
4.  **Currency**: Ensure your account is set to **INR**.

### Configuration:
*   `RAZORPAY_KEY_ID`: Your API Key ID.
*   `RAZORPAY_KEY_SECRET`: Your API Key Secret.

---

## 2. Shiprocket (Logistics)

Used for automated shipping labels, AWB generation, and pickup scheduling.

### Setup Steps:
1.  **Account**: Sign up at [shiprocket.in](https://shiprocket.in).
2.  **API User**: Go to **Settings > API > Configure**.
    *   Ensure your login email and password are used for the API.
3.  **Pickup Address**: Go to **Settings > Pickup Address**.
    *   Add your warehouse address. The **Pincode** must match `PICKUP_PINCODE` in your system config.
4.  **Company ID**: Note your Company ID for debugging if needed.

### Configuration:
*   `SHIPROCKET_EMAIL`: Your Shiprocket account email.
*   `SHIPROCKET_PASSWORD`: Your Shiprocket account password.
*   `PICKUP_PINCODE`: Set this in `system_config` table (default: `501504`).

---

## 3. Brevo (Email - Primary)

Primary service for transactional emails (Order Confirmation, Magic Links).

### Setup Steps:
1.  **Account**: Sign up at [brevo.com](https://brevo.com) (formerly Sendinblue).
2.  **API Key**: Go to **Your Name (top right) > SMTP & API > API Keys**.
    *   Generate a new **v3 API Key**.
3.  **Sender**: Go to **Senders & IPs**.
    *   Add and verify your domain (e.g., `photoframein.com`) or specific email (e.g., `shop@photoframein.com`).
4.  **Domain Setup**: Highly recommended to set up SPF/DKIM records in your DNS for high deliverability.

### Configuration:
*   `BREVO_API_KEY`: Your v3 API Key.

---

## 4. Resend (Email - Fallback & Alerts)

Fallback service if Brevo fails, and used for internal owner alerts.

### Setup Steps:
1.  **Account**: Sign up at [resend.com](https://resend.com).
2.  **API Key**: Create a new API Key.
3.  **Domain**: Verify your domain in the dashboard.

### Configuration:
*   `RESEND_API_KEY`: Your API Key.

---

## 5. Cloudinary (Images & Custom Frames)

Used for hosting product images and handling customer-uploaded photos for custom frames.

### Setup Steps:
1.  **Account**: Sign up at [cloudinary.com](https://cloudinary.com).
2.  **Dashboard**: Note your **Cloud Name**, **API Key**, and **API Secret**.
3.  **Upload Preset (Optional)**: You can create a preset named `products` or use the default.
4.  **Signed Uploads**: PhotoFrameIn uses **Signed Uploads** for security. The backend (`/api/upload/sign`) generates signatures automatically using your secret.

### Configuration:
*   `CLOUDINARY_CLOUD_NAME`: Your cloud name.
*   `CLOUDINARY_API_KEY`: Your API Key.
*   `CLOUDINARY_API_SECRET`: Your API Secret.
*   *Alternatively*, use `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME`.

---

## 6. Supabase (Database & Auth)

The core database and authentication provider.

### Setup Steps:
1.  **Project**: Create a project at [supabase.com](https://supabase.com).
2.  **Database**: Go to **SQL Editor** and run the contents of `supabase/master.sql`.
3.  **Auth**: Go to **Authentication > Providers**.
    *   Enable **Magic Link**.
    *   (Optional) Enable **Google OAuth** and add your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4.  **Settings**: Go to **Project Settings > API** to find your URL and keys.

### Configuration:
*   `SUPABASE_URL`: Your Project URL.
*   `SUPABASE_ANON_KEY`: Your `anon` `public` key.
*   `SUPABASE_SERVICE_KEY`: Your `service_role` `secret` key (keep this extremely safe).

---

## 7. Cloudflare Pages (Hosting & Secrets)

The hosting platform for the entire application.

### Setup Steps:
1.  **Project**: Create a new Pages project from your Git repository.
2.  **Secrets**: Go to **Settings > Variables and Secrets**.
    *   Add all the environment variables listed above as **Secrets**.
    *   *Tip*: Use `wrangler pages secret put <KEY>` from your CLI for faster setup.
3.  **Functions**: Ensure the build command is `npm run build` and the output directory is `dist`.

---

### Need Help?
Contact: [vijayprasadvvp@gmail.com](mailto:vijayprasadvvp@gmail.com)
