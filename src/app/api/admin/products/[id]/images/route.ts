import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { redis, CACHE_KEYS } from "@/lib/redis";
import cloudinary from "@/lib/cloudinary";

// POST /api/admin/products/:id/images - Save product images (with transaction)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
        return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const images = body?.images;
    if (!Array.isArray(images) || images.length === 0) {
        return NextResponse.json({ error: "Images array is required" }, { status: 400 });
    }

    // Ensure only one primary image
    let foundPrimary = false;
    for (const img of images) {
        if (img?.isPrimary && !foundPrimary) foundPrimary = true;
        else img.isPrimary = false;
    }
    if (!foundPrimary) images[0].isPrimary = true;

    const client = await pool.connect();
    let started = false;
    let oldPublicIds: string[] = []; //update to store cloudinary public id for compare

    try {
        await client.query("BEGIN");
        started = true;

        // Lock product row
        const existing = await client.query(
            "SELECT id FROM products WHERE id = $1 FOR UPDATE",
            [productId]
        );
        if (existing.rowCount === 0) {
            await client.query("ROLLBACK");
            started = false;
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        //save old pic before deleting
        const oldImages = await client.query(
            "SELECT cloudinary_public_id FROM product_images WHERE product_id = $1",
            [productId]
        );
        oldPublicIds = oldImages.rows
            .map((row: any) => row.cloudinary_public_id)
            .filter(Boolean);

        // Delete old images
        await client.query("DELETE FROM product_images WHERE product_id = $1", [productId]);

        // Insert new images
        for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (!image?.url || !image?.publicId) {
            throw new Error("Invalid image object: url/publicId missing");
        }

        await client.query(
            `INSERT INTO product_images (
                product_id, image_url, cloudinary_public_id, display_order, is_primary
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
            productId,
            image.url,
            image.publicId,
            image.displayOrder ?? i,
            Boolean(image.isPrimary),
            ]
        );
        }


        await client.query("COMMIT");
        started = false;

        //-------------clean cloudinary----------------
        // Get list of public IDs from new images
        //now we just use frontend to cleanup. No need to querry databse for extra risk
        const currentPublicIds = images
        .map((img: any) => img.publicId)
        .filter(Boolean);

        try {
        // Find images to delete (in old list but not in current database)
            const currentPublicIdSet = new Set(currentPublicIds);

            const toDelete = oldPublicIds.filter(
            oldId => !currentPublicIdSet.has(oldId)
            );

            // Now safely delete from Cloudinary
            await Promise.allSettled(
                toDelete.map((publicId) => cloudinary.uploader.destroy(publicId))
            );


        } catch (err) {
        console.error("Cloudinary cleanup failed:", err);
        // don't throw
        }

        //---------clean cloudinary end------

        // Clear cache
        await redis.del(CACHE_KEYS.PRODUCTS_ALL);

        return NextResponse.json({ success: true, message: "Images saved successfully" });

    } catch (e: any) {
        if (started) {
            try { await client.query("ROLLBACK"); } catch {}
        }
        console.error("Save images error:", e);
        return NextResponse.json({ error: "Failed to save images" }, { status: 500 });
    } finally {
        client.release();
    }
}

// GET /api/admin/products/:id/images - Retrieve product images
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const productId = parseInt(id, 10);

        if (isNaN(productId)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const result = await pool.query(
            `SELECT id, image_url, cloudinary_public_id, display_order, is_primary 
             FROM product_images 
             WHERE product_id = $1
             ORDER BY display_order ASC`,
            [productId]
        );

        return NextResponse.json(result.rows);

    } catch (e: any) {
        console.error("Get images error:", e);
        return NextResponse.json({ error: "Failed to get images" }, { status: 500 });
    }
}