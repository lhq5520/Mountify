import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

// GET /api/admin/inventory - get all product inventory
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const result = await query(
    `SELECT 
        p.id,
        p.name,
        p.price,
        COALESCE(i.on_hand, 0)::int as on_hand,
        COALESCE(i.reserved, 0)::int as reserved,
        GREATEST(COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0), 0)::int as available,
        i.updated_at as inventory_updated_at
    FROM products p
    LEFT JOIN inventory i ON i.sku_id = p.id
    ORDER BY p.name ASC`
    );

    return NextResponse.json({ inventory: result.rows });
  } catch (e: any) {
    console.error("Error fetching inventory:", e);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}