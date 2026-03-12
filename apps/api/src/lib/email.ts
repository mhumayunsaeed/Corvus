import { createTransport, type Transporter } from "nodemailer";
import { lookup } from "node:dns/promises";

// ─── SMTP Transport (lazy) ────────────────────────────────────
// Created on first use so dotenv has time to load env vars.

let _transport: Transporter | null = null;

/**
 * Resolve the SMTP host to an IPv4 address.
 * Many cloud providers (Render, Railway, etc.) cannot reach Gmail SMTP
 * over IPv6, causing ENETUNREACH errors. By resolving to IPv4 ourselves
 * and passing the IP directly, we force Nodemailer to use IPv4.
 */
let _resolvedHost: string | null = null;

async function resolveSmtpHost(): Promise<string> {
  if (_resolvedHost) return _resolvedHost;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  try {
    const { address } = await lookup(host, { family: 4 });
    _resolvedHost = address;
    console.log(`SMTP: resolved ${host} → ${address} (IPv4)`);
    return address;
  } catch {
    // If DNS lookup fails, fall back to the hostname
    _resolvedHost = host;
    return host;
  }
}

function getTransport(): Transporter {
  if (!_transport) {
    _transport = createTransport({
      host: _resolvedHost || process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== "false",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
      // Force the TLS servername so certificate validation works when
      // connecting by IP instead of hostname.
      tls: {
        servername: process.env.SMTP_HOST || "smtp.gmail.com",
      },
    });
  }
  return _transport;
}

function getFrom(): string {
  return process.env.EMAIL_FROM || "Corvus <noreply@corvus.app>";
}

function getFrontendUrl(): string {
  return process.env.FRONTEND_URL || "http://localhost:3000";
}

// ─── Email Templates ───────────────────────────────────────────

function baseEmailHtml(heading: string, bodyText: string, ctaLabel: string, ctaUrl: string, footerNote: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#0C0C0F;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0C0C0F;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#16161A;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">

          <!-- Header gradient bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#7C6AF7 0%,#3ECFCF 100%);"></td>
          </tr>

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:40px 40px 24px 40px;">
              <img src="${getFrontendUrl()}/corvus-logo.png" alt="Corvus" width="56" height="56" style="width:56px;height:56px;border-radius:14px;display:block;" />
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding:0 40px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#EAEAEC;line-height:1.3;">
                ${heading}
              </h1>
            </td>
          </tr>

          <!-- Body text -->
          <tr>
            <td align="center" style="padding:12px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#8B8B9E;">
                ${bodyText}
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:32px 40px;">
              <a href="${ctaUrl}"
                 style="display:inline-block;padding:14px 40px;background-color:#7C6AF7;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.3px;"
              >
                ${ctaLabel}
              </a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td align="center" style="padding:0 40px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#5C5C6F;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#7C6AF7;word-break:break-all;">
                ${ctaUrl}
              </p>
            </td>
          </tr>

          <!-- Footer note -->
          <tr>
            <td align="center" style="padding:24px 40px;">
              <div style="background-color:#0C0C0F;border-radius:10px;padding:14px 20px;border:1px solid rgba(255,255,255,0.04);">
                <p style="margin:0;font-size:13px;color:#5C5C6F;">
                  ${footerNote}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:16px 40px 32px;">
              <p style="margin:0;font-size:12px;color:#3D3D4E;">
                &copy; ${new Date().getFullYear()} Corvus &mdash; Where your world connects.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Send helpers ──────────────────────────────────────────────

function hasSmtpConfig(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function logFallback(to: string, label: string, url: string): void {
  console.log("");
  console.log(`  \u250C\u2500 \uD83D\uDCE7 ${label} (dev fallback) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  console.log(`  \u2502 To: ${to}`);
  console.log(`  \u2502 URL: ${url}`);
  console.log("  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log("");
}

async function sendMail(to: string, subject: string, html: string, fallbackLabel: string, fallbackUrl: string): Promise<void> {
  if (!hasSmtpConfig()) {
    logFallback(to, fallbackLabel, fallbackUrl);
    return;
  }

  // Resolve SMTP host to IPv4 before first send.
  // Many cloud providers (Render, Railway) can't reach Gmail over IPv6.
  await resolveSmtpHost();

  try {
    await getTransport().sendMail({ from: getFrom(), to, subject, html });
    console.log(`\u2713 ${fallbackLabel} sent to ${to}`);
  } catch (err) {
    console.error("SMTP send error:", err);
    logFallback(to, fallbackLabel, fallbackUrl);
    throw new Error("Failed to send email. Please try again later.");
  }
}

export { hasSmtpConfig };

// ─── Public API ────────────────────────────────────────────────

export async function sendConfirmationEmail(
  email: string,
  displayName: string,
  token: string
): Promise<void> {
  const confirmUrl = `${getFrontendUrl()}/confirm-email?token=${token}`;
  const html = baseEmailHtml(
    "Confirm your email",
    `Hey ${displayName}, welcome to Corvus! Click the button below to verify your email address and activate your account.`,
    "Verify Email Address",
    confirmUrl,
    `This link expires in <strong style="color:#8B8B9E;">24 hours</strong>. If you didn't create this account, you can safely ignore this email.`
  );

  await sendMail(email, "Confirm your Corvus account", html, "Confirmation email", confirmUrl);
}

export async function sendPasswordResetEmail(
  email: string,
  displayName: string,
  token: string
): Promise<void> {
  const resetUrl = `${getFrontendUrl()}/reset-password?token=${token}`;
  const html = baseEmailHtml(
    "Reset your password",
    `Hey ${displayName}, we received a request to reset your password. Click the button below to choose a new one.`,
    "Reset Password",
    resetUrl,
    `This link expires in <strong style="color:#8B8B9E;">1 hour</strong>. If you didn't request this, you can safely ignore this email.`
  );

  await sendMail(email, "Reset your Corvus password", html, "Password reset email", resetUrl);
}
