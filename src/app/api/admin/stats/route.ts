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

    // Get product count
    const productsResult = await query("SELECT COUNT(*) FROM products");
    const productCount = parseInt(productsResult.rows[0].count, 10);

    // Get order count
    const ordersResult = await query("SELECT COUNT(*) FROM orders");
    const orderCount = parseInt(ordersResult.rows[0].count, 10);

    // Get total revenue
    const revenueResult = await query("SELECT COALESCE(SUM(total), 0) as revenue FROM orders");
    const totalRevenue = parseFloat(revenueResult.rows[0].revenue);

    // Get recent orders (last 7 days)
    const recentOrdersResult = await query(`
      SELECT COUNT(*) FROM orders 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    const recentOrders = parseInt(recentOrdersResult.rows[0].count, 10);

    return NextResponse.json({
      products: productCount,
      orders: orderCount,
      revenue: totalRevenue,
      recentOrders: recentOrders,
    });

  } catch (e: any) {
    console.error("Error fetching stats:", e);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}