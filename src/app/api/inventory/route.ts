import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/inventory - Publicly get inventory status
// Optional parameter: ?ids=1,2,3 to query specific products
export async function GET(req: NextRequest) {
  try {
    const idsParam = req.nextUrl.searchParams.get("ids");

    let result;

    if (idsParam) {
      // Query specific products
      const ids = Array.from(
        new Set(
          idsParam
            .split(",")
            .map((id) => parseInt(id.trim(), 10))
            .filter((id) => Number.isFinite(id))
        )
      );

      if (ids.length === 0) {
        return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
      }

      // Simple abuse guard: limit ids count
      if (ids.length > 200) {
        return NextResponse.json(
          { error: "Too many ids (max 200)" },
          { status: 400 }
        );
      }

      result = await query(
        `SELECT 
          p.id,
          GREATEST(COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0), 0)::int as available
         FROM products p
         LEFT JOIN inventory i ON i.sku_id = p.id
         WHERE p.id = ANY($1::int[])`,
        [ids]
      );
    } else {
      // Query all products
      result = await query(
        `SELECT 
          p.id,
          GREATEST(COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0), 0)::int as available
         FROM products p
         LEFT JOIN inventory i ON i.sku_id = p.id`
      );
    }

    // Convert to Map format for frontend convenience
    // NOTE: JSON keys are strings in practice.
    const inventory: Record<string, number> = {};
    for (const row of result.rows) {
      inventory[String(row.id)] = row.available;
    }

    return NextResponse.json({ inventory });
  } catch (e: any) {
    console.error("Error fetching inventory:", e);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
