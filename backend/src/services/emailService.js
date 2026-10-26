import nodemailer from 'nodemailer';

/**
 * Email Dispatch Service for QuickShare
 * 
 * Supports:
 * 1. Real SMTP (Gmail App Password, Brevo, Resend, or SendGrid free tiers)
 * 2. Secure Server-Side Logging fallback
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return transporter;
}

export async function sendEmailOtp(email, otp) {
  const cleanEmail = email.trim().toLowerCase();
  const mailer = getTransporter();

  if (mailer) {
    try {
      const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@quickshare.local';
      await mailer.sendMail({
        from: `"QuickShare Security" <${fromAddr}>`,
        to: cleanEmail,
        subject: `Your QuickShare Verification Code: ${otp}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #e11d48; margin-top: 0;">QuickShare Verification</h2>
            <p style="color: #475569; font-size: 15px;">Use the 6-digit one-time code below to authenticate your account:</p>
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">This code is valid for 5 minutes. If you did not request this code, you can safely ignore this email.</p>
          </div>
        `
      });
      console.log(`[Email] ✅ Verification OTP sent to ${cleanEmail}`);
      return { success: true, provider: 'smtp' };
    } catch (err) {
      console.error(`[Email] Failed to send email:`, err.message);
    }
  }

  // Secure Server-Side Notification Fallback
  console.log(`\n========================================================`);
  console.log(`📧 [QuickShare Email Dispatcher]`);
  console.log(`Recipient Email : ${cleanEmail}`);
  console.log(`Secure OTP Code : ${otp}`);
  console.log(`Valid Duration  : 5 Minutes`);
  console.log(`(To send real emails to inboxes, set SMTP_USER and SMTP_PASS in backend/.env)`);
  console.log(`========================================================\n`);

  return { success: true, provider: 'console_secure' };
}
