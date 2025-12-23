import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

// DELETE /api/cart/:productId - Remove specific product from cart
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { productId } = await params;
    const productIdNum = parseInt(productId);

    if (isNaN(productIdNum)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    await query(
      "DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2",
      [userId, productIdNum]
    );

    return NextResponse.json(
      { message: "Item removed from cart" },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("Error removing from cart:", e);
    return NextResponse.json(
      { error: "Failed to remove item" },
      { status: 500 }
    );
  }
}

// PATCH /api/cart/:productId - Update item quantity
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { productId } = await params;
    const productIdNum = parseInt(productId);

    if (isNaN(productIdNum)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { quantity } = body;

    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      return NextResponse.json(
        { error: "Quantity must be between 1 and 1000" },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE cart_items 
       SET quantity = $1, updated_at = NOW() 
       WHERE user_id = $2 AND product_id = $3
       RETURNING id`,
      [quantity, userId, productIdNum]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Item not found in cart" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Quantity updated" },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("Error updating cart item:", e);
    return NextResponse.json(
      { error: "Failed to update quantity" },
      { status: 500 }
    );
  }
}