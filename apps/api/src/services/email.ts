import { ErrorCode } from '@blueflutes/shared';
import { Resend } from 'resend';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Email delivery is not configured (missing RESEND_API_KEY)',
      503,
    );
  }
  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendMagicLinkEmail(params: {
  to: string;
  url: string;
  tenantName: string;
  expiresInMinutes: number;
}): Promise<void> {
  const { to, url, tenantName, expiresInMinutes } = params;

  const { error } = await getResend().emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: `Sign in to ${tenantName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e5e5;">
    <p style="margin:0 0 8px;font-size:14px;color:#666;">${tenantName}</p>
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:#111;">Your sign-in link</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#444;">Click the button below to sign in. This link works once and expires in ${expiresInMinutes} minutes.</p>
    <a href="${url}" style="display:inline-block;background:#111;color:#fff;border-radius:8px;padding:14px 28px;font-size:15px;font-weight:600;text-decoration:none;">Sign in to ${tenantName}</a>
    <p style="margin:24px 0 0;font-size:13px;color:#888;">
      If you didn&apos;t request this, you can safely ignore this email.
      This link expires in ${expiresInMinutes} minutes and can only be used once.
    </p>
  </div>
</body>
</html>`,
    text: `Sign in to ${tenantName}\n\n${url}\n\nThis link expires in ${expiresInMinutes} minutes and can only be used once. If you didn't request this, ignore this email.`,
  });

  if (error) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      `Failed to send magic link email: ${error.message}`,
      502,
    );
  }
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
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      `Failed to send OTP email: ${error.message}`,
      502,
    );
  }
}
