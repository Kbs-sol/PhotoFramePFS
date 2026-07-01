// Server-only email service (Brevo primary + Resend fallback). Ported from PhotoFramePFS.
// Reads keys from process.env. Free tiers: Brevo 300/day, Resend 100/day.
import { getSupabase, hasSupabase } from "./supabase.server";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  orderId?: string;
  type: string;
}

let _brevoSentToday = 0;
let _brevoCountDate = "";

function getBrevoCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  if (_brevoCountDate !== today) {
    _brevoSentToday = 0;
    _brevoCountDate = today;
  }
  return _brevoSentToday;
}
function incrementBrevoCount(): void {
  _brevoSentToday++;
}

function getISTHour(): number {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % (24 * 60);
  return Math.floor(istMinutes / 60);
}

async function sendBrevo(params: EmailParams): Promise<boolean> {
  try {
    const senderEmail = process.env.FROM_EMAIL || "noreply@chitraframe.in";
    const senderName = process.env.FROM_NAME || "ChitraFrame";
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendResend(params: EmailParams): Promise<boolean> {
  try {
    const senderEmail = process.env.FROM_EMAIL || "noreply@chitraframe.in";
    const senderName = process.env.FROM_NAME || "ChitraFrame";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function logEmail(params: EmailParams, service: string, status: string, error?: string) {
  try {
    if (!hasSupabase()) return;
    const sb = getSupabase();
    await sb.from("email_log").insert({
      order_id: params.orderId,
      recipient: params.to,
      type: params.type,
      subject: params.subject,
      service,
      status,
      error_message: error,
    });
  } catch {
    /* never throw */
  }
}

export async function sendEmail(
  params: EmailParams,
): Promise<{ success: boolean; service: string }> {
  const istHour = getISTHour();
  if (istHour >= 19 && istHour < 22 && params.type === "review_request") {
    try {
      if (hasSupabase()) {
        const sb = getSupabase();
        await sb.from("email_failures").insert({
          order_id: params.orderId,
          recipient: params.to,
          type: params.type,
          subject: params.subject,
          body: params.html,
          last_error: "Deferred: peak hours",
        });
      }
    } catch {
      /* non-critical */
    }
    return { success: true, service: "deferred" };
  }

  const brevoCount = getBrevoCount();
  if (brevoCount < 270 && process.env.BREVO_API_KEY) {
    if (await sendBrevo(params)) {
      incrementBrevoCount();
      logEmail(params, "brevo", "sent").catch(() => {});
      return { success: true, service: "brevo" };
    }
  }

  if (process.env.RESEND_API_KEY) {
    if (await sendResend(params)) {
      logEmail(params, "resend", "sent").catch(() => {});
      return { success: true, service: "resend" };
    }
  }

  try {
    if (hasSupabase()) {
      const sb = getSupabase();
      await sb.from("email_failures").insert({
        order_id: params.orderId,
        recipient: params.to,
        type: params.type,
        subject: params.subject,
        body: params.html,
        last_error: "Both Brevo and Resend failed",
      });
      await logEmail(params, "none", "failed", "Both services failed");
    }
  } catch {
    /* non-critical */
  }
  return { success: false, service: "none" };
}

export async function sendOwnerAlert(subject: string, html: string) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return;
  // Prefer Resend for owner alerts (never consume Brevo quota); fall back to Brevo.
  if (process.env.RESEND_API_KEY) {
    await sendResend({ to: ownerEmail, subject: `[ChitraFrame] ${subject}`, html, type: "owner_alert" });
  } else if (process.env.BREVO_API_KEY) {
    await sendBrevo({ to: ownerEmail, subject: `[ChitraFrame] ${subject}`, html, type: "owner_alert" });
  }
}
