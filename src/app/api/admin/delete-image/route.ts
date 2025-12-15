import { NextResponse } from "next/server";
import { auth } from "@/auth";
import cloudinary from "@/lib/cloudinary";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { publicId } = await req.json();

    if (!publicId || typeof publicId !== "string") {
      return NextResponse.json(
        { error: "publicId is required" },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.destroy(publicId);

    console.log(`Deleted Cloudinary image: ${publicId}`, result);

    return NextResponse.json({ success: true, result });

  } catch (e: any) {
    console.error("Delete image error:", e);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}