import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all orders
    const ordersResult = await query(`
      SELECT id, user_id, email, total, status, stripe_session_id, created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    // Get order items for each order
    const orders = await Promise.all(
      ordersResult.rows.map(async (order: any) => {
        const itemsResult = await query(`
          SELECT oi.quantity, oi.price, p.id as product_id, p.name as product_name, p.image_url
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
        `, [order.id]);

        return {
          id: order.id,
          userId: order.user_id,
          email: order.email,
          total: order.total,
          status: order.status,
          stripeSessionId: order.stripe_session_id,
          createdAt: order.created_at,
          items: itemsResult.rows.map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            imageUrl: item.image_url,
            quantity: item.quantity,
            price: item.price,
          })),
        };
      })
    );

    return NextResponse.json({ orders });

  } catch (e: any) {
    console.error("Error fetching orders:", e);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}