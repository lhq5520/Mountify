import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { redis, CACHE_KEYS } from "@/lib/redis";

// PUT /api/admin/products/:id - Update product
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    // Check admin permission
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, price, description, detailedDescription, imageUrl, imageUrlHover } = body;

    // Validation (same as POST)
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!price || typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: "Price must be greater than 0" },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!imageUrl || imageUrl.trim().length === 0) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // URL format validation
    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(imageUrl)) {
      return NextResponse.json(
        { error: "Image URL must be a valid URL" },
        { status: 400 }
      );
    }

    if (imageUrlHover && !urlRegex.test(imageUrlHover)) {
      return NextResponse.json(
        { error: "Hover image URL must be a valid URL" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existing = await query(
      "SELECT id FROM products WHERE id = $1",
      [productId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Update product
    const result = await query(
      `UPDATE products 
       SET name = $1, price = $2, description = $3, detailed_description = $4, 
           image_url = $5, image_url_hover = $6
       WHERE id = $7
       RETURNING id, name, price`,
      [
        name.trim(),
        price,
        description.trim(),
        detailedDescription?.trim() || description.trim(),
        imageUrl.trim(),
        imageUrlHover?.trim() || null,
        productId
      ]
    );

    // Invalidate cache
    await redis.del(CACHE_KEYS.PRODUCTS_ALL);
    console.log('Cleared product cache after update');

    return NextResponse.json(
      { 
        message: "Product updated successfully",
        product: result.rows[0]
      },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("Error updating product:", e);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/:id - Delete product
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    // Check admin permission
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existing = await query(
      "SELECT id, name FROM products WHERE id = $1",
      [productId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Delete product
    await query("DELETE FROM products WHERE id = $1", [productId]);

    // Invalidate cache
    await redis.del(CACHE_KEYS.PRODUCTS_ALL);
    console.log('Cleared product cache after deletion');

    return NextResponse.json(
      { 
        message: "Product deleted successfully",
        deletedProduct: existing.rows[0]
      },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("Error deleting product:", e);
    
    // Check if it's a foreign key constraint error
    if (e.message?.includes('foreign key')) {
      return NextResponse.json(
        { error: "Cannot delete product: It exists in active carts or orders" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}