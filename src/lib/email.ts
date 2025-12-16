import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Reset your password - Mountify",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #1d1d1f;">
                Reset your password
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #424245;">
                We received a request to reset your password. Click the button below to choose a new password.
              </p>
              
              <a href="${resetUrl}" style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-size: 15px; font-weight: 500;">
                Reset Password
              </a>
              
              <p style="margin: 32px 0 0; font-size: 13px; line-height: 1.6; color: #86868b;">
                This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
              </p>
              
              <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">
              
              <p style="margin: 0; font-size: 12px; color: #86868b;">
                Mountify · Sent automatically
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error };
    }

    return { success: true, data };

  } catch (e: any) {
    console.error("Email send exception:", e);
    return { success: false, error: e };
  }
}