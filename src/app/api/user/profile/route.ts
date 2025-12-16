import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const result = await query(
      "SELECT id, email, role, created_at, password_hash FROM users WHERE id = $1",
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      hasPassword: user.password_hash !== null,
    });

  } catch (e: any) {
    console.error("Error fetching profile:", e);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}