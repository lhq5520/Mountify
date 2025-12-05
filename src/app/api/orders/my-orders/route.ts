import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Get current logged-in user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // Query orders with items using LEFT JOIN
    const result = await query(
      `SELECT 
        o.id as order_id,
        o.email,
        o.total,
        o.status,
        o.created_at,
        oi.product_id,
        oi.quantity,
        oi.price as item_price,
        p.name as product_name,
        p.image_url
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC`,
      [userId]
    );

    // Transform flat JOIN results into nested structure
    const ordersMap = new Map();

    for (const row of result.rows) {
      // If this order doesn't exist in map yet, add it
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          id: row.order_id,
          email: row.email,
          total: parseFloat(row.total),
          status: row.status,
          createdAt: row.created_at,
          items: []
        });
      }

      // Add item to this order's items array (if item exists)
      if (row.product_id) {
        ordersMap.get(row.order_id).items.push({
          productId: row.product_id,
          name: row.product_name,
          quantity: row.quantity,
          price: parseFloat(row.item_price),
          imageUrl: row.image_url
        });
      }
    }

    // Convert Map to array
    const orders = Array.from(ordersMap.values());

    return NextResponse.json({ orders });

  } catch (e: any) {
    console.error("Error fetching orders:", e);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}