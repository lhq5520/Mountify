// api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Rate limiting wrapper for POST requests (login)
async function POST_withRateLimit(req: NextRequest) {
  // Only rate limit credential login attempts
  const url = new URL(req.url);
  const isCredentialLogin = url.pathname.includes('/callback/credentials');
  
  if (isCredentialLogin) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    
    // Check rate limit
    const ipKey = `rl:login:ip:${ip}`;
    const ipCount = await redis.incr(ipKey);
    
    if (ipCount === 1) {
      await redis.expire(ipKey, 300); // 5 minutes
    }
    
    // Log current attempt count
    console.log(`[Login Rate Limit] IP: ${ip} - Attempt ${ipCount}/10`);
    
    if (ipCount > 10) {
      console.warn(`[Login Rate Limit] IP: ${ip} - BLOCKED (${ipCount}/10 attempts)`);
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again in 5 minutes.',
          retryAfter: 300 // seconds
        },
        { status: 429 }
      );
    }
  }
  
  // If not rate limited, proceed with normal auth
  return handlers.POST(req);
}

export const GET = handlers.GET;
export { POST_withRateLimit as POST };