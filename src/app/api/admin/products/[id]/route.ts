import { NextResponse } from "next/server";
import { auth } from "@/auth";
import cloudinary from "@/lib/cloudinary";
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
    const { 
      name, 
      price, 
      description, 
      detailedDescription, 
      imageUrl, 
      imagePublicId,
      imageUrlHover, 
      imageHoverPublicId,
      categoryId 
    } = body;

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

    if (!imagePublicId) {
      return NextResponse.json(
        { error: "Main image publicId is required" },
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

    if (imageUrlHover && !imageHoverPublicId) {
      return NextResponse.json(
        { error: "Hover image publicId is required when hover image is provided" },
        { status: 400 }
      );
    }

    if (imageHoverPublicId && !imageUrlHover) {
      return NextResponse.json(
        { error: "Hover image URL is required when hover image publicId is provided" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existing = await query(
      "SELECT id, image_public_id, image_hover_public_id FROM products WHERE id = $1",
      [productId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Clean up old images when they are being replaced
    const existingRow = existing.rows[0];

    if (existingRow.image_public_id && existingRow.image_public_id !== imagePublicId) {
      try {
        await cloudinary.uploader.destroy(existingRow.image_public_id);
      } catch (destroyErr) {
        console.error("Failed to delete old main image from Cloudinary:", destroyErr);
      }
    }

    if (imageUrlHover && existingRow.image_hover_public_id && existingRow.image_hover_public_id !== imageHoverPublicId) {
      try {
        await cloudinary.uploader.destroy(existingRow.image_hover_public_id);
      } catch (destroyErr) {
        console.error("Failed to delete old hover image from Cloudinary:", destroyErr);
      }
    }

    // Update product
    const result = await query(
      `UPDATE products 
       SET name = $1, price = $2, description = $3, detailed_description = $4, 
           image_url = $5, image_public_id = $6, image_url_hover = $7, image_hover_public_id = $8, category_id = $9
       WHERE id = $10
       RETURNING id, name, price, image_public_id, image_hover_public_id`,
      [
        name.trim(),
        price,
        description.trim(),
        detailedDescription?.trim() || description.trim(),
        imageUrl.trim(),
        imagePublicId,
        imageUrlHover?.trim() || null,
        imageUrlHover ? imageHoverPublicId : null,
        categoryId || null,
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
      "SELECT id, name, image_public_id, image_hover_public_id FROM products WHERE id = $1",
      [productId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Delete associated Cloudinary images (best effort)
    const toDelete = [] as string[];
    if (existing.rows[0].image_public_id) {
      toDelete.push(existing.rows[0].image_public_id);
    }
    if (existing.rows[0].image_hover_public_id) {
      toDelete.push(existing.rows[0].image_hover_public_id);
    }

    for (const publicId of toDelete) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (destroyErr) {
        console.error("Failed to delete Cloudinary image during product deletion:", destroyErr);
      }
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