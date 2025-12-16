//reset my password

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "@/lib/db";

// Rate limit helper
function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

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
    const { token, password } = await req.json();

    // ---- Input validation ----
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid reset link" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // ---- Rate limiting ----
    const ip = getClientIp(req);

    // Per-IP: 10 attempts / 15 minutes
    const ipKey = `rl:reset:ip:${ip}`;
    const ipAllowed = await rateLimitFixedWindow(ipKey, 10, 900);
    if (!ipAllowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    // hash token for redis rate limit and later database lookup
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Per-token: 5 attempts / 15 minutes (prevent brute force on same token)
    const tokenKey = `rl:reset:tokenhash:${tokenHash}`;
    const tokenAllowed = await rateLimitFixedWindow(tokenKey, 5, 900);
    if (!tokenAllowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new reset link." },
        { status: 429 }
      );
    }

    // ----lookup db to compare hash token previous generated ----

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Atomically consume token
      const consume = await client.query(
        `
        UPDATE password_reset_tokens
        SET used = TRUE
        WHERE token_hash = $1
          AND used = FALSE
          AND expires_at > NOW()
        RETURNING user_id
        `,
        [tokenHash]
      );

      if (consume.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Invalid or expired reset link" },
          { status: 400 }
        );
      }

      const userId = consume.rows[0].user_id;

      // Update password
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        [passwordHash, userId]
      );

      await client.query("COMMIT");
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw e;
    } finally {
      client.release();
    }

    // ---- Clear rate limit for this token ----
    await redis.del(tokenKey);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    });

  } catch (e: any) {
    console.error("Reset password error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}