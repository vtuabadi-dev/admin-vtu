import type { NotificationProvider, NotificationMessage, NotificationResult, NotificationChannel } from "./types";

// Mock provider — logs to console, always returns success
// Used in development and as fallback when no real gateway is configured
export function createMockProvider(): NotificationProvider {
  return {
    name: "mock",
    channels: ["email", "whatsapp", "telegram", "in_app"] as NotificationChannel[],

    async send(message: NotificationMessage): Promise<NotificationResult> {
      const messageId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.log(`[notify:mock] Sent via ${message.channel} to ${message.recipient}: ${message.subject ?? message.body.slice(0, 80)}`);
      return {
        success: true,
        messageId,
        channel: message.channel,
        sentAt: new Date().toISOString(),
        retryable: false,
      };
    },

    async healthCheck() {
      return { ok: true, detail: "mock provider — always healthy" };
    },
  };
}

// Console provider — logs detailed message info, for debugging
export function createConsoleProvider(): NotificationProvider {
  return {
    name: "console",
    channels: ["email", "whatsapp", "telegram", "in_app"] as NotificationChannel[],

    async send(message: NotificationMessage): Promise<NotificationResult> {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`[notify:console] Channel: ${message.channel}`);
      console.log(`[notify:console] To: ${message.recipient}`);
      console.log(`[notify:console] Subject: ${message.subject ?? "(none)"}`);
      console.log(`[notify:console] Body: ${message.body}`);
      if (message.templateVars) {
        console.log(`[notify:console] Template vars:`, message.templateVars);
      }
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return {
        success: true,
        messageId: `console-${Date.now()}`,
        channel: message.channel,
        sentAt: new Date().toISOString(),
        retryable: false,
      };
    },

    async healthCheck() {
      return { ok: true, detail: "console provider — always healthy" };
    },
  };
}

// Resend provider — sends real emails via Resend API
export function createResendProvider(apiKey?: string): NotificationProvider {
  const key = apiKey || process.env.RESEND_API_KEY;
  return {
    name: "resend",
    channels: ["email"] as NotificationChannel[],

    async send(message: NotificationMessage): Promise<NotificationResult> {
      if (!key) {
        console.warn("[notify:resend] RESEND_API_KEY missing — fallback to mock provider");
        return createMockProvider().send(message);
      }

      try {
        const { Resend } = await import("resend");
        const resend = new Resend(key);
        const fromEmail = process.env.RESEND_FROM_EMAIL || "VTU Abadi Travel <onboarding@resend.dev>";

        const htmlParagraphs = message.body
          .split("\n\n")
          .map((p) => `<p style="margin: 0 0 14px; line-height: 1.6; color: #334155; font-size: 14px;">${p.replace(/\n/g, "<br/>")}</p>`)
          .join("");

        const styledHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 12px; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 20px 24px;">
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">VTU TRAVEL SYSTEM</h2>
      <p style="color: #10b981; margin: 4px 0 0; font-size: 12px; font-weight: 600;">Sistem Informasi &amp; Operasional Manajemen</p>
    </div>
    <div style="padding: 28px 24px;">
      ${htmlParagraphs}
    </div>
    <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 11px; margin: 0;">&copy; PT VAUZA TAMMA ABADI &bull; Notifikasi Resmi Sistem Operasional</p>
    </div>
  </div>
</body>
</html>`;

        const payload: any = {
          from: fromEmail,
          to: message.recipient,
          subject: message.subject ?? "Konfirmasi Registrasi Jamaah Umroh",
          text: message.body,
          html: styledHtml,
        };

        if (message.attachments && message.attachments.length > 0) {
          payload.attachments = message.attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
          }));
        }

        const res = await resend.emails.send(payload);
        if (res.error) {
          throw new Error(res.error.message);
        }

        return {
          success: true,
          messageId: res.data?.id || `resend-${Date.now()}`,
          channel: "email",
          sentAt: new Date().toISOString(),
          retryable: false,
        };
      } catch (err: any) {
        console.error("[notify:resend] Email send failed:", err?.message || err);
        return {
          success: false,
          error: err?.message || "Email dispatch failed",
          channel: "email",
          sentAt: new Date().toISOString(),
          retryable: true,
        };
      }
    },

    async healthCheck() {
      return { ok: !!key, detail: key ? "Resend API key configured" : "RESEND_API_KEY missing" };
    },
  };
}

// Nodemailer (Gmail / SMTP) provider — sends real emails via SMTP using Gmail App Password or custom SMTP
export function createNodemailerProvider(): NotificationProvider {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "465");
  const secure = process.env.SMTP_SECURE !== "false";

  return {
    name: "nodemailer",
    channels: ["email"] as NotificationChannel[],

    async send(message: NotificationMessage): Promise<NotificationResult> {
      if (!user || !pass) {
        console.warn("[notify:nodemailer] SMTP credentials (GMAIL_USER / GMAIL_APP_PASSWORD) missing — fallback to mock provider");
        return createMockProvider().send(message);
      }

      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
        });

        const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_FROM || `VTU ABADI Travel <${user}>`;

        const htmlParagraphs = message.body
          .split("\n\n")
          .map((p) => {
            const withLinks = p.replace(/(https?:\/\/[^\s]+)/g, (url) => {
              if (url.includes("/setup-password")) {
                return `<div style="text-align: center; margin: 24px 0;">
                  <a href="${url}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);">
                    👉 Atur Password Akun Anda Sekarang
                  </a>
                  <p style="font-size: 11px; color: #64748b; word-break: break-all; margin: 10px 0 0 0;">
                    Atau salin tautan berikut ke browser: <br/><a href="${url}" style="color: #2563eb; text-decoration: underline;">${url}</a>
                  </p>
                </div>`;
              }
              return `<a href="${url}" style="color: #2563eb; text-decoration: underline;" target="_blank">${url}</a>`;
            });
            return `<p style="margin: 0 0 14px; line-height: 1.6; color: #334155; font-size: 14px;">${withLinks.replace(/\n/g, "<br/>")}</p>`;
          })
          .join("");

        const styledHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 12px; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 20px 24px;">
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">VTU TRAVEL SYSTEM</h2>
      <p style="color: #10b981; margin: 4px 0 0; font-size: 12px; font-weight: 600;">Sistem Informasi &amp; Operasional Manajemen</p>
    </div>
    <div style="padding: 28px 24px;">
      ${htmlParagraphs}
    </div>
    <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 11px; margin: 0;">&copy; PT VAUZA TAMMA ABADI &bull; Notifikasi Resmi Sistem Operasional</p>
    </div>
  </div>
</body>
</html>`;

        const mailOptions: any = {
          from: fromAddress,
          to: message.recipient,
          subject: message.subject ?? "Konfirmasi Registrasi Jamaah Umroh",
          text: message.body,
          html: styledHtml,
        };

        if (message.attachments && message.attachments.length > 0) {
          mailOptions.attachments = message.attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          }));
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`[notify:nodemailer] Email sent successfully to ${message.recipient}: ${info.messageId}`);

        return {
          success: true,
          messageId: info.messageId || `smtp-${Date.now()}`,
          channel: "email",
          sentAt: new Date().toISOString(),
          retryable: false,
        };
      } catch (err: any) {
        console.error("[notify:nodemailer] SMTP send failed:", err?.message || err);
        return {
          success: false,
          error: err?.message || "SMTP dispatch failed",
          channel: "email",
          sentAt: new Date().toISOString(),
          retryable: true,
        };
      }
    },

    async healthCheck() {
      return { ok: !!(user && pass), detail: user && pass ? `Nodemailer configured for ${user}` : "SMTP credentials missing" };
    },
  };
}

// Supabase Auth Email Provider — uses Supabase Auth REST API to send invites using Supabase built-in SMTP
export function createSupabaseEmailProvider(): NotificationProvider {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

  // Auto infer Supabase URL from DATABASE_URL if not directly set
  if (!supabaseUrl && process.env.DATABASE_URL) {
    const match = process.env.DATABASE_URL.match(/postgres\.([a-zA-Z0-9_-]+):/);
    if (match && match[1]) {
      supabaseUrl = `https://${match[1]}.supabase.co`;
    }
  }

  return {
    name: "supabase",
    channels: ["email"] as NotificationChannel[],

    async send(message: NotificationMessage): Promise<NotificationResult> {
      if (!supabaseUrl || !serviceRoleKey) {
        console.warn("[notify:supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — fallback to mock provider");
        return createMockProvider().send(message);
      }

      try {
        const cleanUrl = supabaseUrl.replace(/\/$/, "");
        const inviteEndpoint = `${cleanUrl}/auth/v1/invite`;

        const res = await fetch(inviteEndpoint, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: message.recipient,
            data: {
              subject: message.subject,
              body: message.body,
              ...(message.templateVars || {}),
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Supabase Auth Invite API returned ${res.status}: ${errText}`);
        }

        const data = await res.json().catch(() => ({}));
        console.log(`[notify:supabase] Invite email dispatched via Supabase to ${message.recipient}`);

        return {
          success: true,
          messageId: data.id || `supabase-${Date.now()}`,
          channel: "email",
          sentAt: new Date().toISOString(),
          retryable: false,
        };
      } catch (err: any) {
        console.error("[notify:supabase] Supabase email dispatch failed:", err?.message || err);
        return {
          success: false,
          error: err?.message || "Supabase email dispatch failed",
          channel: "email",
          sentAt: new Date().toISOString(),
          retryable: true,
        };
      }
    },

    async healthCheck() {
      return {
        ok: !!(supabaseUrl && serviceRoleKey),
        detail: supabaseUrl && serviceRoleKey ? `Supabase email configured for ${supabaseUrl}` : "SUPABASE_SERVICE_ROLE_KEY missing",
      };
    },
  };
}


