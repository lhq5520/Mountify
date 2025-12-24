// /api/webhooks/stripe

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { query } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";

let stripe: Stripe | null = null;

function getStripe() {
  if (stripe) return stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is missing (runtime required)");

  stripe = new Stripe(key, { apiVersion: "2025-11-17.clover" as any });
  return stripe;
}

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is missing (runtime required)");
  return secret;
}


export async function POST(req: Request) {
  try {
    // 1. Read raw request body
    const body = await req.text()
    
    // 2. Verify Stripe signature
        // 1. get signature（from header）
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
        return NextResponse.json({ error: "No signature" }, { status: 400 });
    }
        // 2. verify signature and parse event
    const event = getStripe().webhooks.constructEvent(body, sig, getWebhookSecret());


    // 3. Parse event
    // 4. Handle based on event type
    // 5. Update database
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session& {
          customer_details?: {
            name?: string;
            address?: {
              line1?: string;
              line2?: string;
              city?: string;
              state?: string;
              postal_code?: string;
              country?: string;
            };
            phone?: string;
            email?: string;
          };
        };
        
        // 1.check is payment status is successful
        if (session.payment_status === "paid") {
          // update order status
          // Save shipping snapshot (only when paid)
          const shippingAddress = session.customer_details?.address ?? null;
          const shippingName = session.customer_details?.name ?? null;
          const shippingPhone = session.customer_details?.phone ?? null;

          const updateRes = await query(
            `UPDATE orders 
            SET status = 'paid',
                shipping_name = $2,
                shipping_phone = $3,
                shipping_address = $4,
                updated_at = NOW()
            WHERE stripe_session_id = $1
              AND status = 'pending'
            RETURNING id`,
            [session.id, shippingName, shippingPhone, shippingAddress]
          );

          if (updateRes.rows.length === 0) {
            // already processed OR order not found
            console.log(`[webhook] orders not updated for session ${session.id} (maybe already paid/expired/cancelled or missing)`);
          } else {
            console.log(`[webhook] order paid + snapshot saved, orderId=${updateRes.rows[0].id}`);
          }


          console.log(`Order paid for session: ${session.id}`);

          // 1.5 deduct inventory (on_hand -= qty, reserved -= qty)
          try {

            const deductRes = await query(
              `UPDATE orders
              SET inventory_reserved = FALSE
              WHERE stripe_session_id = $1
                AND inventory_reserved = TRUE
              RETURNING id`,
              [session.id]
            );

            if (deductRes.rows.length > 0) {
              const orderId = deductRes.rows[0].id;

              // only the first webhook can reach here
              await query(
                `UPDATE inventory i
                SET on_hand = i.on_hand - oi.quantity,
                    reserved = i.reserved - oi.quantity,
                    updated_at = NOW()
                FROM order_items oi
                WHERE oi.order_id = $1
                  AND i.sku_id = oi.product_id`,
                [orderId]
              );

              console.log(`Inventory deducted for order #${orderId}`);
            }

          } catch (invError) {
            console.error("Failed to deduct inventory:", invError);
          }

          // 2. get order detail and send email
          try {
            const orderResult = await query(
              `SELECT o.id, o.email, o.total, o.created_at,
                      json_agg(json_build_object(
                        'name', p.name,
                        'quantity', oi.quantity,
                        'price', oi.price
                      )
                        ORDER BY oi.id ASC
                      ) as items
              FROM orders o
              JOIN order_items oi ON o.id = oi.order_id
              JOIN products p ON oi.product_id = p.id
              WHERE o.stripe_session_id = $1
              GROUP BY o.id`,
              [session.id]
            );

            if (orderResult.rows.length > 0) {
              const order = orderResult.rows[0];
              await sendOrderConfirmationEmail({
                orderId: order.id,
                email: order.email,
                total: parseFloat(order.total),
                items: order.items,
                createdAt: order.created_at,
              });
              console.log(`Confirmation email sent for order #${order.id}`);
            }
          } catch (emailError) {
            console.error("Failed to send confirmation email:", emailError);
          }
          
        //console.log("=== DEBUG ADDRESS ===");
        //console.log("customer_details:", JSON.stringify(session.customer_details, null, 2));

        // 3. Save user address (if user is logged in)
        if (session.customer_details?.address) {
          try {
            // Get user_id from order
            const userResult = await query(
              "SELECT user_id FROM orders WHERE stripe_session_id = $1",
              [session.id]
            );

            const userId = userResult.rows[0]?.user_id;

            if (userId) {
              const shipping = session.customer_details;
              const addr = shipping.address!;
              const phone = shipping.phone || null;

              // Check if address already exists (avoid duplicates)
              // NOTE: Use DB constraint + UPSERT to avoid race conditions
              // Also compute is_default in SQL using NOT EXISTS to avoid extra COUNT query
              const insertResult = await query(
                `INSERT INTO addresses (
                  user_id, name, line1, line2, city, state, postal_code, country, phone, is_default
                )
                VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9,
                  NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = $1)
                )
                ON CONFLICT (user_id, line1, postal_code) DO NOTHING
                RETURNING id`,
                [
                  userId,
                  shipping.name || "Default",
                  addr.line1,
                  addr.line2 || null,
                  addr.city,
                  addr.state || null,
                  addr.postal_code,
                  addr.country,
                  phone,
                ]
              );

              if (insertResult.rows.length > 0) {
                console.log(`Address saved for user ${userId}`);
              }
            }
          } catch (addrError: any) {
            // If you have a partial unique index enforcing one default per user,
            // a rare race can still happen when two inserts try to be default at the same time.
            // In that case, retry inserting as non-default.
            if (addrError?.code === "23505") {
              try {
                const userResult = await query(
                  "SELECT user_id FROM orders WHERE stripe_session_id = $1",
                  [session.id]
                );

                const userId = userResult.rows[0]?.user_id;

                if (userId && session.customer_details?.address) {
                  const shipping = session.customer_details;
                  const addr = shipping.address!;
                  const phone = shipping.phone || null;

                  await query(
                    `INSERT INTO addresses (
                      user_id, name, line1, line2, city, state, postal_code, country, phone, is_default
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
                    ON CONFLICT (user_id, line1, postal_code) DO NOTHING`,
                    [
                      userId,
                      shipping.name || "Default",
                      addr.line1,
                      addr.line2 || null,
                      addr.city,
                      addr.state || null,
                      addr.postal_code,
                      addr.country,
                      phone,
                    ]
                  );
                }
              } catch (retryErr) {
                console.error("Failed to save address (retry):", retryErr);
              }
              return;
            }
            console.error("Failed to save address:", addrError);
          }
        }

        }
        break;
      
      case "checkout.session.expired":
        const expiredSession = event.data.object as Stripe.Checkout.Session;

        try {
          const releaseRes = await query(
            `UPDATE orders
            SET status = 'expired',
                inventory_reserved = FALSE
            WHERE stripe_session_id = $1
              AND inventory_reserved = TRUE
            RETURNING id`,
            [expiredSession.id]
          );

          if (releaseRes.rows.length > 0) {
            const orderId = releaseRes.rows[0].id;

            await query(
              `UPDATE inventory i
              SET reserved = GREATEST(0, i.reserved - oi.quantity),
                  updated_at = NOW()
              FROM order_items oi
              WHERE oi.order_id = $1
                AND i.sku_id = oi.product_id`,
              [orderId]
            );

            console.log(`Released inventory for expired order #${orderId}`);
          }
        } catch (expireError) {
          console.error("Failed to release inventory:", expireError);
        }
        break;


      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (e: any) {
    console.error("Webhook error:", e);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}