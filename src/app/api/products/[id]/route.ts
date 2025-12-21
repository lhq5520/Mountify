// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!rawId || Number.isNaN(id)) {
    return NextResponse.json(
      { error: "Invalid id", debug: { rawId } },
      { status: 400 }
    );
  }

  // Query product basic information
  const result = await query("SELECT * FROM products WHERE id = $1", [id]);

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "Product not found", debug: { id } },
      { status: 404 }
    );
  }

  const row: any = result.rows[0];

  const product = {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    description: row.description,
    detailed_description: row.detailed_description,
    imageUrl: row.image_url,
    imageUrlHover: row.image_url_hover,
    imagePublicId: row.image_public_id,
    imageHoverPublicId: row.image_hover_public_id,
  };

  // Query product images
  const imagesResult = await query(
    `SELECT image_url, cloudinary_public_id, display_order, is_primary 
     FROM product_images 
     WHERE product_id = $1 
     ORDER BY display_order ASC`,
    [id]
  );

  const images = imagesResult.rows.map((img: any) => ({
    url: img.image_url,
    publicId: img.cloudinary_public_id,
    displayOrder: img.display_order,
    isPrimary: img.is_primary,
  }));

  return NextResponse.json({ product, images });
}

// fetch(`/api/products/${id}`) → directly fetch this product
// Use res.ok to determine success/failure; on failure, read the `error` field from the JSON
// Three states:
// loading: initial / in-progress request
// error: something went wrong
// product === null: no data (e.g., 404)
