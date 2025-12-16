import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() || "";
    const rawLimit = parseInt(searchParams.get("limit") || "5", 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 50)
      : 5;


    const normalizedQ = q.replace(/\s+/g, " ").trim();

    if (normalizedQ.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    if (normalizedQ.length > 64) {
      return NextResponse.json({ suggestions: [] });
    }


    // Use ILIKE for fuzzy search (case-insensitive)
        // Search in name and description fields
    const result = await query(
      `
      SELECT id, name, price, image_url
      FROM products
      WHERE name ILIKE $1 OR description ILIKE $1
      ORDER BY 
        CASE 
          WHEN name ILIKE $2 THEN 0
          WHEN name ILIKE $1 THEN 1
          WHEN description ILIKE $1 THEN 2
          ELSE 3
        END,
        name ASC
      LIMIT $3
      `,
      [`%${normalizedQ}%`, `${normalizedQ}%`, limit]
    );

    const suggestions = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      imageUrl: row.image_url,
    }));

    return NextResponse.json({ suggestions });

  } catch (e: any) {
    console.error("Search error:", e);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}