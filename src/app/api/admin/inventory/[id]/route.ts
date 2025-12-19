import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

// PUT /api/admin/inventory/:id - update inventory
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const skuId = parseInt(id, 10);
    if (!Number.isFinite(skuId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    // verify product exists
    const productCheck = await query("SELECT id FROM products WHERE id = $1", [skuId]);
    if (productCheck.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { onHand } = body;

    if (typeof onHand !== "number" || !Number.isInteger(onHand) || onHand < 0) {
      return NextResponse.json(
        { error: "on_hand must be a non-negative integer" },
        { status: 400 }
      );
    }

    // Upsert inventory
    // NOTE:
    // - If inventory row does not exist, create it with reserved = 0
    // - If row exists, only update on_hand (DO NOT touch reserved)
    // - available is clamped to >= 0 for display safety
    const result = await query(
      `INSERT INTO inventory (sku_id, on_hand, reserved)
       VALUES ($1, $2, 0)
       ON CONFLICT (sku_id) DO UPDATE
       SET on_hand = EXCLUDED.on_hand,
           updated_at = NOW()
       RETURNING 
         sku_id, 
         on_hand, 
         reserved, 
         GREATEST(on_hand - reserved, 0)::int as available`,
      [skuId, onHand]
    );

    return NextResponse.json({ inventory: result.rows[0] });
  } catch (e: any) {
    console.error("Error updating inventory:", e);

    // reserved > on_hand constrain violation
    if (e.code === "23514") {
      return NextResponse.json(
        { error: "Cannot set stock below reserved quantity" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}
