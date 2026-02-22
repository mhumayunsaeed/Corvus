import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.EMAIL_FROM || "Veyra <noreply@veyra.app>";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

function confirmationEmailHtml(
  displayName: string,
  confirmUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirm your Veyra account</title>
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
              <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#7C6AF7 0%,#3ECFCF 100%);display:inline-block;text-align:center;line-height:56px;">
                <span style="color:#FFFFFF;font-weight:700;font-size:24px;">V</span>
              </div>
            </td>
          </tr>
          
          <!-- Heading -->
          <tr>
            <td align="center" style="padding:0 40px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#EAEAEC;line-height:1.3;">
                Confirm your email
              </h1>
            </td>
          </tr>
          
          <!-- Body text -->
          <tr>
            <td align="center" style="padding:12px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#8B8B9E;">
                Hey ${displayName}, welcome to Veyra! Click the button below to verify your email address and activate your account.
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:32px 40px;">
              <a href="${confirmUrl}" 
                 style="display:inline-block;padding:14px 40px;background-color:#7C6AF7;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.3px;"
              >
                Verify Email Address
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
                ${confirmUrl}
              </p>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td align="center" style="padding:24px 40px;">
              <div style="background-color:#0C0C0F;border-radius:10px;padding:14px 20px;border:1px solid rgba(255,255,255,0.04);">
                <p style="margin:0;font-size:13px;color:#5C5C6F;">
                  This link expires in <strong style="color:#8B8B9E;">24 hours</strong>. If you didn't create this account, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:16px 40px 32px;">
              <p style="margin:0;font-size:12px;color:#3D3D4E;">
                © ${new Date().getFullYear()} Veyra — Where your world connects.
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

export async function sendConfirmationEmail(
  email: string,
  displayName: string,
  token: string
): Promise<void> {
  const confirmUrl = `${frontendUrl}/confirm-email?token=${token}`;

  try {
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: "Confirm your Veyra account",
      html: confirmationEmailHtml(displayName, confirmUrl),
    });

    if (error) {
      console.error("Resend API error:", error);
      // In development, log the link instead of failing
      console.log("");
      console.log("  ┌─ 📧 Email send failed (dev fallback) ──────");
      console.log(`  │ To: ${email}`);
      console.log(`  │ Verify URL: ${confirmUrl}`);
      console.log("  └─────────────────────────────────────────────");
      console.log("");
      return; // Don't throw — let registration succeed
    }

    console.log(`✓ Confirmation email sent to ${email}`);
  } catch (err) {
    console.error("Email transport error:", err);
    console.log("");
    console.log("  ┌─ 📧 Email send failed (dev fallback) ──────");
    console.log(`  │ To: ${email}`);
    console.log(`  │ Verify URL: ${confirmUrl}`);
    console.log("  └─────────────────────────────────────────────");
    console.log("");
    // Don't throw — let registration succeed in dev
  }
}
