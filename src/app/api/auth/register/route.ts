// api/auth/register/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const normalizedEmail = (email || "").toLowerCase().trim();

    // Rate limiting: prevent registration abuse
    // Per-IP: max 5 registrations per 10 minutes
    const ipKey = `rl:register:ip:${ip}`;
    const ipCount = await redis.incr(ipKey);
    if (ipCount === 1) {
      await redis.expire(ipKey, 600); // 10 minutes
    }
    if (ipCount > 5) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Per-email: max 1 registration attempt per 10 minutes
    const emailKey = `rl:register:email:${normalizedEmail}`;
    const emailCount = await redis.incr(emailKey);
    if (emailCount === 1) {
      await redis.expire(emailKey, 600); // 10 minutes
    }
    if (emailCount > 1) {
      return NextResponse.json(
        { error: "Too many attempts for this email. Please try again later." },
        { status: 429 }
      );
    }
    
    // Step 1: Validate inputs exist
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    
    // Step 2: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    
    // Step 3: Validate password strength (at least 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    
    // Step 4: Check if email already exists
    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }
    
    // Step 5: Hash password (10 salt rounds - standard security)
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Step 6: Insert new user into database
    const result = await query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, passwordHash]
    );
    
    const newUser = result.rows[0];
    
    // Step 7: Return success
    return NextResponse.json(
      { 
        message: "User created successfully",
        user: { 
          id: newUser.id, 
          email: newUser.email,
          createdAt: newUser.created_at
        }
      },
      { status: 201 }
    );
    
  } catch (e: any) {
    console.error("Registration error:", e);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}