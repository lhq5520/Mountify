import { Resend } from "resend";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderEmailData {
  orderId: number;
  email: string;
  total: number;
  items: OrderItem[];
  createdAt: string;
}

interface ShipmentEmailData {
  orderId: number;
  email: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  shippedAt: string | Date;
}

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (resendClient) return resendClient;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Note：don't throw when module is loading；only throw when send emails
    throw new Error("RESEND_API_KEY is not set");
  }

  resendClient = new Resend(key);
  return resendClient;
}


const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
) {
  
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set; skipping shipment email");
    return { success: false, error: "Missing RESEND_API_KEY" } as const;
  }

  try {
    const { data, error } = await getResend().emails.send({
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

export async function sendOrderConfirmationEmail(data: OrderEmailData) {

  
  const { orderId, email, total, items, createdAt } = data;

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set; skipping shipment email");
    return { success: false, error: "Missing RESEND_API_KEY" } as const;
  }

  // 生成商品列表 HTML
  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
          <p style="margin: 0; font-size: 15px; color: #1d1d1f;">${item.name}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #86868b;">Qty: ${item.quantity}</p>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">
          <p style="margin: 0; font-size: 15px; color: #1d1d1f;">$${(Number(item.price) * item.quantity).toFixed(2)}</p>
        </td>
      </tr>
    `
    )
    .join("");

  try {
    const { data: result, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `Order Confirmed #${orderId} - Mountify`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7; padding: 40px 20px; margin: 0;">
            <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <div style="background: #000; padding: 32px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #fff;">
                  Order Confirmed ✓
                </h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <p style="margin: 0 0 8px; font-size: 13px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px;">
                  Order #${orderId}
                </p>
                <p style="margin: 0 0 24px; font-size: 15px; color: #424245;">
                  Thank you for your order! We're getting it ready.
                </p>
                
                <!-- Order Items -->
                <table style="width: 100%; border-collapse: collapse;">
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
                
                <!-- Total -->
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #1d1d1f;">
                  <table style="width: 100%;">
                    <tr>
                      <td style="font-size: 15px; font-weight: 600; color: #1d1d1f;">Total</td>
                      <td style="font-size: 18px; font-weight: 600; color: #1d1d1f; text-align: right;">
                        $${total.toFixed(2)}
                      </td>
                    </tr>
                  </table>
                </div>
                
                <!-- Order Date -->
                <p style="margin: 24px 0 0; font-size: 13px; color: #86868b;">
                  Order placed: ${new Date(createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              
              <!-- Footer -->
              <div style="padding: 24px 32px; background: #f5f5f7; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #86868b;">
                  Questions? Please contact our customer services.
                </p>
                <p style="margin: 12px 0 0; font-size: 12px; color: #86868b;">
                  Mountify · Thank you for shopping with us
                </p>
              </div>
              
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Order confirmation email error:", error);
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (e: any) {
    console.error("Order confirmation email exception:", e);
    return { success: false, error: e };
  }
}

export async function sendShipmentNotificationEmail(data: ShipmentEmailData) {
  const { orderId, email, carrier, trackingNumber, trackingUrl, shippedAt } = data;

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set; skipping shipment email");
    return { success: false, error: "Missing RESEND_API_KEY" } as const;
  }

  const shippedDateText = new Date(shippedAt).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const safeTrackingUrl = trackingUrl || "";

  try {
    const { data: result, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `Your order #${orderId} has shipped - Mountify`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7; padding: 40px 20px; margin: 0;">
            <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="background: #000; padding: 28px 32px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #fff;">On the way</h1>
              </div>

              <div style="padding: 32px;">
                <p style="margin: 0 0 8px; font-size: 13px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px;">
                  Order #${orderId}
                </p>
                <p style="margin: 0 0 16px; font-size: 15px; color: #424245;">
                  Your order has shipped. Here are your tracking details:
                </p>

                <div style="padding: 16px; border: 1px solid #e5e5e5; border-radius: 12px; background: #fafafa;">
                  <p style="margin: 0 0 8px; font-size: 15px; color: #1d1d1f;">
                    Carrier: <strong>${carrier}</strong>
                  </p>
                  <p style="margin: 0 0 12px; font-size: 15px; color: #1d1d1f;">
                    Tracking #: <strong>${trackingNumber}</strong>
                  </p>
                  ${safeTrackingUrl ? `<a href="${safeTrackingUrl}" style="display: inline-block; margin-top: 4px; padding: 12px 18px; background: #000; color: #fff; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600;">Track package</a>` : ""}
                </div>

                <p style="margin: 16px 0 0; font-size: 13px; color: #86868b;">
                  Shipped on ${shippedDateText}
                </p>
              </div>

              <div style="padding: 20px 32px; background: #f5f5f7; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #86868b;">
                  Thanks for shopping with Mountify.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Shipment email error:", error);
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (e: any) {
    console.error("Shipment email exception:", e);
    return { success: false, error: e };
  }
}