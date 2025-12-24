//forget my password

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";
import { redis } from "@/lib/redis";

//two helpers for rate limiting
function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

// Fixed-window: allow `limit` per `windowSeconds`
async function rateLimitFixedWindow(
  key: string,
  limit: number,
  windowSeconds: number
) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return count <= limit;
}


export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Build reset link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!baseUrl) {
      console.error("Missing NEXT_PUBLIC_SITE_URL");
      // Still return success to avoid leaking anything
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    // ---- rate limit (redis) ----
    const ip = getClientIp(req);

    // 1) Per-IP: 10 requests / 5 minutes
    const ipKey = `rl:forgot:ip:${ip}`;
    const ipAllowed = await rateLimitFixedWindow(ipKey, 10, 300);
    if (!ipAllowed) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    // 2) Per-email: 3 requests / 15 minutes
    const emailKey = `rl:forgot:email:${normalizedEmail}`;
    const emailAllowed = await rateLimitFixedWindow(emailKey, 3, 900);
    if (!emailAllowed) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    // 3) Cooldown: 60 seconds per email
    const cooldownKey = `cooldown:forgot:email:${normalizedEmail}`;
    const inCooldown = await redis.get(cooldownKey);
    if (inCooldown) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    // Upstash supports { ex: seconds }
    await redis.set(cooldownKey, "1", { ex: 60 });

    // Find user
    const userResult = await query(
      "SELECT id, password_hash FROM users WHERE email = $1",
      [normalizedEmail]
    );

    // Return success regardless of whether user exists (prevent email enumeration attack)
    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    const user = userResult.rows[0];

    // OAuth users have no password and cannot reset
    if (!user.password_hash) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    // Generate random token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Delete previous tokens for this user (optional, prevent multiple valid tokens)
    // Atomic upsert (no DELETE + INSERT)
    await query(
      `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used)
      VALUES ($1, $2, NOW() + INTERVAL '1 hour', false)
      ON CONFLICT (user_id)
      DO UPDATE SET token_hash = EXCLUDED.token_hash,
                    expires_at = NOW() + INTERVAL '1 hour',
                    used = false
      `,
      [user.id, tokenHash]
    );

    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    // Send email
    const emailResult = await sendPasswordResetEmail(normalizedEmail, resetUrl);

    //for safety, even it's failed, we still send success for it 
    if (!emailResult.success) {
      console.error("Failed to send reset email:", emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent.",
    });

  } catch (e: any) {
    console.error("Forgot password error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}