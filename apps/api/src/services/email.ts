import { Resend } from 'resend';
import { env } from '../config/env.js';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendOtpEmail(params: {
  to: string;
  code: string;
  tenantName: string;
  expiresInMinutes: number;
}): Promise<void> {
  const { to, code, tenantName, expiresInMinutes } = params;

  const { error } = await getResend().emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: `Your ${tenantName} sign-in code: ${code}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e5e5;">
    <p style="margin:0 0 8px;font-size:14px;color:#666;">${tenantName}</p>
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:#111;">Sign-in code</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#444;">Use this code to sign in to your studio:</p>
    <div style="background:#f4f4f4;border-radius:8px;padding:20px;text-align:center;margin:16px 0;">
      <span style="font-size:36px;font-weight:700;letter-spacing:0.2em;color:#111;font-variant-numeric:tabular-nums;">${code}</span>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#888;">
      This code expires in ${expiresInMinutes} minutes. Do not share it with anyone.
    </p>
  </div>
</body>
</html>`,
    text: `Your ${tenantName} sign-in code is: ${code}\n\nThis code expires in ${expiresInMinutes} minutes. Do not share it with anyone.`,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
