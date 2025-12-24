// api/checkout

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { pool, query } from "@/lib/db"; // use for order insertion when checkout
import { auth } from "@/auth";  // ← use for user validation
import { redis } from "@/lib/redis";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

let stripe: Stripe | null = null;

function getStripe() {
  if (stripe) return stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // 关键：build 阶段不应该炸；只有真正调用 checkout 才报错
    throw new Error("STRIPE_SECRET_KEY is missing (runtime required)");
  }

  stripe = new Stripe(key, { apiVersion: "2025-11-17.clover" as any });
  return stripe;
}


//step3b updated - for security purpose, we only need quantity and productID from frontend
type CheckoutItem = {
  productId: number;
  quantity: number;
};

type CheckoutBody = {
  items: CheckoutItem[];
  email?: string;
};

// reserve expire after 30 mins
const RESERVATION_MINUTES = 30;

export async function POST(req: Request) {
  try {
    const usersession = await auth();
    // 1. parse the JSON

    // step4d- Rate Limiting using redis 
    // Identify user: use user_id if logged in, otherwise use IP
    const identifier = usersession?.user?.id 
      ? `user:${usersession.user.id}`
      : `ip:${req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'}`;
    
    const rateLimitKey = `ratelimit:checkout:${identifier}`;
    
    // Increment counter
    const requestCount = await redis.incr(rateLimitKey);
    
    // Set expiration on first request (60 seconds window)
    if (requestCount === 1) {
      await redis.expire(rateLimitKey, 60);
    }
    
    // Check if exceeded limit
    if (requestCount > 10) {
      return NextResponse.json(
        { 
          error: "Too many checkout attempts. Please try again in a minute.",
          retryAfter: 60 
        },
        { status: 429 }
      );
    }
    
    console.log(`Rate limit: ${identifier} - ${requestCount}/10`);
    // End Rate Limiting 

    let body: CheckoutBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    
    // 2. verify：if cart is empty?
    if (!body.items || body.items.length === 0) {  // two conditions here
      return NextResponse.json(
        { error: "No items to checkout" },
        { status: 400 }
      );
    }

    // updated in step3b - validate quantity range to avoid abuse
    for (const item of body.items) {
      if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity)) {
        return NextResponse.json(
          { error: "Invalid quantity format" },
          { status: 400 }
        );
      }

      if (item.quantity < 1 || item.quantity > 100) {
        return NextResponse.json(
          { error: "Quantity must be between 1 and 100" },
          { status: 400 }
        );
      }
    }

    // ---------------- step5i - merge duplicate items (same product multiple adds) ----------------
    // Users can add the same product multiple times. We merge them here so DB stores 1 row per product.
    // ex. mergedItems = [{ productId: 101, quantity: 2 },{ productId: 205, quantity: 1 }];
    const mergedMap = new Map<number, number>();
    for (const item of body.items) {
      mergedMap.set(item.productId, (mergedMap.get(item.productId) || 0) + item.quantity);
    }
    const mergedItems: CheckoutItem[] = Array.from(mergedMap.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    // ------------------------------------------------------------------------------------------

    // updated in step3b - querry to check price from backend
    const requestedIds = mergedItems.map((item) => item.productId);

    // updated in step4a- now using session to send user email and potentially userID
    const email = usersession?.user?.email || body.email || null;
    const userId = usersession?.user?.id ? parseInt(usersession.user.id) : null;

    // calculate reserveuntil time
    const reservedUntil = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

    // ---------------- step5i - transaction (reserve inventory + create order + order_items) ----------------
    const client = await pool.connect();
    let orderId: number | null = null;

    try {
      await client.query("BEGIN");

      // 1) Load products (price/name) from DB - do NOT trust frontend
      const productResult = await client.query(
        "SELECT id, price, name FROM products WHERE id = ANY($1)",
        [requestedIds]
      );

      // verify if we have the product
      const foundIds = productResult.rows.map((row: { id: number }) => row.id)!;
      const missingIds = requestedIds.filter(id => !foundIds.includes(id));
      if (missingIds.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: `Products not found: ${missingIds.join(', ')}` },
          { status: 400 }
        );
      }

      // build productMap (101, { price: 29.99, name: "Phone Mount" })
      const productMap = new Map<number, { price: number; name: string }>();
      for (const row of productResult.rows) {
        productMap.set(row.id, { price: Number(row.price), name: row.name });
      }

      // 2) Ensure inventory rows exist (so UPDATE can lock + work)
      await client.query(
        `INSERT INTO inventory (sku_id, on_hand, reserved)
         SELECT unnest($1::bigint[]), 0, 0
         ON CONFLICT (sku_id) DO NOTHING`,
        [requestedIds]
      );

      // 3) Reserve inventory atomically (prevents oversell)
      for (const item of mergedItems) {
        const reserveRes = await client.query(
          `UPDATE inventory
           SET reserved = reserved + $1,
               updated_at = NOW()
           WHERE sku_id = $2
             AND (on_hand - reserved) >= $1
           RETURNING sku_id`,
          [item.quantity, item.productId]
        );

        if (reserveRes.rowCount === 0) {
          // Not enough stock -> rollback everything
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Insufficient stock", productId: item.productId },
            { status: 409 }
          );
        }
      }

      // 4) Calculate total (from DB prices)
      const total = mergedItems.reduce((sum, item) => {
        const p = productMap.get(item.productId)!;
        return sum + p.price * item.quantity;  // ← price from db
      }, 0);

      // 5) Insert order (stripe_session_id will be filled later)
      const orderRes = await client.query(
        `INSERT INTO orders (email, total, status, stripe_session_id, user_id, inventory_reserved, reserved_until)
         VALUES ($1, $2, $3, NULL, $4, TRUE, $5)
         RETURNING id`,
        [email, total, "pending", userId, reservedUntil]
      );

      orderId = orderRes.rows[0].id as number;

      // 6) Insert order_items (1 row per product)
      for (const item of mergedItems) {
        const p = productMap.get(item.productId)!;

        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (order_id, product_id)
           DO UPDATE SET quantity = EXCLUDED.quantity`, // merged already, keep deterministic
          [orderId, item.productId, item.quantity, p.price]
        );
      }

      await client.query("COMMIT");

      // ---------------- step3b - implement stripe (OUTSIDE transaction) ----------------
      // ---------------- step5i - implment try catch error to prevent stripe failed but order + reserve wrote in the db
      // Build line_items from mergedItems
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
        mergedItems.map((item) => {
          const p = productMap.get(item.productId)!;
          return {  
            quantity: item.quantity,
            price_data: {
              currency: "usd",
              product_data: { name: p.name },
              unit_amount: Math.round(p.price * 100),
            },
          };
        });

      let stripeSession: Stripe.Checkout.Session;
      try{
        stripeSession = await getStripe().checkout.sessions.create({
          mode: "payment",
          line_items: lineItems,
          success_url: `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${SITE_URL}/cart`,
          customer_email: email ?? undefined,
          // get user address
          shipping_address_collection: {
            allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'CN'],
          },
          // get user phone number
          phone_number_collection: {
            enabled: true,
          },
          // customized text
          custom_text: {
            submit: {
              message: 'We will process your order as soon as possible.',
            },
          },
          // Session expire 30 minutes later
          expires_at: Math.floor(Date.now() / 1000) + RESERVATION_MINUTES * 60,
        });
      } catch (err){
        // Stripe failed AFTER DB committed -> release reservation + cancel order
        if (orderId) {
          await query(
            `UPDATE inventory i
            SET reserved = GREATEST(0, i.reserved - oi.quantity),
                updated_at = NOW()
            FROM order_items oi
            WHERE oi.order_id = $1
              AND i.sku_id = oi.product_id`,
            [orderId]
          );

          await query(
            `UPDATE orders
            SET status = 'cancelled',
                inventory_reserved = FALSE
            WHERE id = $1`,
            [orderId]
          );
        }

        throw err;
      }
      

      // 7) Save stripe_session_id back to order (short DB call)
      const updateRes = await query(
        `UPDATE orders
        SET stripe_session_id = $1
        WHERE id = $2
          AND stripe_session_id IS NULL
        RETURNING id`,
        [stripeSession.id, orderId]
      );

      if (updateRes.rowCount === 0) {
        console.log("stripe_session_id already set, skip update", { orderId });
      }

      return NextResponse.json({ url: stripeSession.url });

    } catch (txErr: any) {
      // If anything failed AFTER reserve+commit, we should release. 
      // But in this structure, we commit before Stripe; errors here are handled below.
      try { await client.query("ROLLBACK"); } catch {}
      console.error("Checkout transaction failed:", txErr);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
    // ---------------- end transaction ----------------

  } catch (e: any) {
    console.error("Error creating checkout session:", e);

    // If Stripe creation failed AFTER we committed order+reserve, release reservation.
    // (orderId not directly available here in this outer catch; main errors should be handled inside)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
