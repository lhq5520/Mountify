This is a ecommerce website - still under development. the following step record how this website was constructed

## Technical Stack

- **Frontend:** Next.js 16 (App Router), React, TypeScript
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Neon)
- **Payment:** Stripe Checkout + Webhooks
- **Dev Tools:** Stripe CLI

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Potential Optimization：

cart - might need redis or prisma or even db to make it persistent and support cross device view function

checkout status - now using polling to check status -> can be optimized using websocket/SSE

security update

- price verification from backend instead of trusing frontend
- payment verification (making sure user actually paid)

## Version 1A:

Goal: use fake data(API) to fetch data! In another words, use api as database to return data!

✅ You’ve made it happen:

/api/products → returns JSON

/products → fetches data from the API and renders it

That means your frontend and backend just connected for the first time — browser → API → data response.

## Version 1B:

Goal: make frontend able to talk to backend(through API!)
✅ Testing after completion

Visit /products, then click on a product.

It should navigate to /product/1, /product/2, etc., showing the corresponding product details.

The page should display the content correctly.

💡 If you see “Loading...” flash briefly before the details appear → it’s working correctly.

🔍 What you’ll learn in this stage

Skill Practical Meaning
Dynamic routing [id] You’ll be able to build any kind of “detail page” or “user page.”
useParams The standard way to read URL parameters.
fetch + find The logic behind filtering and retrieving data.
Component navigation (Link) The foundation of how routes and pages connect.

## Version 1C:

Goal: making cart function working!

✅ Test this out!

Open /product/1 → Click “Add to Cart”

Open /cart → Check whether the item you just added appears

Add it a few more times → See if the quantity increases

Click “Remove” → Check if the item can be deleted

🧭 After completing this, you’ll have learned:

| Concept                                         | Practical Meaning                                |
| ----------------------------------------------- | ------------------------------------------------ |
| **Context / Provider**                          | A clean way to share state across multiple pages |
| **Custom Hook (`useCart`)**                     | A good habit for organizing and reusing logic    |
| **State update logic (`setCart(prev => ...)`)** | The core idea behind React’s immutable updates   |

## Version 2A:

🧭 Stage Goal

So far, your /api/products endpoint has only been returning a dummy array.
Next, we want this API to start pulling real data from the database.

| Part                   | Status                                                                            |
| ---------------------- | --------------------------------------------------------------------------------- |
| Backend API            | ✔ Updated to read from the database                                               |
| Database Connection    | ✔ Configured with Pool + environment variables                                    |
| Frontend Page          | ✔ Reused as-is, no structural changes needed                                      |
| Technical Breakthrough | ✅ You successfully rendered dynamic data from a real database for the first time |

## Version 2B:

In 2A the setup is:

/api/products → fetch all products from the database ✅

/products → product list page ✅

/product/[id] → the detail page is still doing fetch("/api/products") and then find ❌ (kind of crude)

We want to change it to:

/api/products/[id] → handles a single product

/product/[id] → directly requests /api/products/:id

Now this part has finished:

Database → API (list + single) → Frontend pages (list + detail).

## Version 2C:

Overall Goal:

On the /cart page, the user clicks a “Checkout” button →
send a POST request to /api/orders →
the backend writes the order and order items into Neon →
returns an orderId →
the frontend clears the cart and shows a success message.

Now:

At this point, you already have:

✅ Products: listing and detail pages, both reading from the database
✅ Cart: managed with Context and shared across the entire app
✅ Checkout: /cart → POST /api/orders → Neon writes to orders & order_items
✅ Simple admin panel: /admin/orders to view all orders

This is already a fully functional end-to-end e-commerce MVP — just missing payments and real user management.

## Version 2D - Stripe Checkout Integration (Sandbox Version):

Goal
Integrate Stripe Checkout to enable test payment processing in the e-commerce MVP, focusing on understanding the payment flow rather than production-ready security.
What Was Implemented

1. Backend API Endpoint (/api/checkout/route.ts)

Created POST endpoint to generate Stripe Checkout Sessions
Converts cart items into Stripe's line_items format
Handles price conversion (CAD dollars → cents)
Returns checkout URL for frontend redirection
Note: Currently accepts frontend-provided prices without database verification (security limitation acknowledged for learning purposes)

2. Success Page (/checkout/success/page.tsx)

Client component to display payment confirmation
Reads session_id from URL query parameters
Provides user feedback after successful payment
Note: Does not verify session validity with Stripe (to be improved in future iterations)

3. Cart Page Enhancement (/cart/page.tsx)

Added handleStripeCheckout() function
Sends cart data (including product names) to /api/checkout
Redirects browser to Stripe's hosted payment page using window.location.href
Maintains existing order creation functionality

Technical Flow Achieved

User clicks "Checkout" → Frontend sends cart data to backend
Backend creates Stripe Session → Receives payment URL
Browser redirects to Stripe's hosted checkout page
User enters test card details (4242 4242 4242 4242)
On success → Stripe redirects to /checkout/success
On cancel → Stripe redirects back to /cart

Key Learnings

Checkout Session concept: Temporary authorization token containing order details
Separation of concerns: Credit card data never touches your server (PCI compliance)
Payment flow timeline: Session creation ≠ payment completion
Security awareness: Identified two critical issues for future improvement:

Trusting frontend-provided prices
No session validation on success page

Status
✅ Functional for testing and learning
⚠️ Not production-ready - requires database price validation and webhook integration

# Version 2E: Stripe Checkout with Webhook Integration

## Overview

Implemented a complete payment flow using Stripe Checkout with webhook-based order status tracking. This integration creates a production-ready payment system where orders are created with pending status and automatically updated to paid status via Stripe webhooks.

---

## Goals

- Integrate Stripe Checkout for secure payment processing
- Implement webhook-based order confirmation (asynchronous payment verification)
- Build real-time order status polling on the success page
- Maintain proper order lifecycle management (pending → paid)
- Learn production-grade security practices (signature verification, server-side validation)

---

## What Was Implemented

### 1. Database Schema Updates

**File:** Neon PostgreSQL Console

Added two new columns to the `orders` table:

```sql
ALTER TABLE orders
ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending',
ADD COLUMN stripe_session_id TEXT NOT NULL;
```

**Purpose:**

- `status`: Track order lifecycle (pending/paid/cancelled)
- `stripe_session_id`: Link orders to Stripe Checkout Sessions

---

### 2. Backend API Modifications

#### A. Modified `/api/checkout/route.ts`

**Changes:**

- Creates a pending order in the database **before** redirecting to Stripe
- Stores Stripe Session ID with the order for webhook correlation
- Validates and transforms cart data into Stripe's `line_items` format

**Flow:**

```typescript
1. Receive cart data from frontend
2. Validate items exist
3. Create Stripe Checkout Session
4. Create order in database with status='pending' and stripe_session_id
5. Insert order_items for each product
6. Return session.url to frontend
```

**Key code snippet:**

```typescript
const session = await stripe.checkout.sessions.create({...});

// Create pending order
const orderRes = await query(
  "INSERT INTO orders (email, total_cad, status, stripe_session_id) VALUES ($1, $2, $3, $4) RETURNING id",
  [email, total, "pending", session.id]
);
```

---

#### B. Created `/api/webhooks/stripe/route.ts`

**Purpose:** Receive payment confirmation from Stripe and update order status

**Security Implementation:**

- Webhook signature verification using `stripe.webhooks.constructEvent()`
- Validates requests are genuinely from Stripe (not spoofed)
- Uses `STRIPE_WEBHOOK_SECRET` for signature validation

**Event Handling:**

```typescript
switch (event.type) {
  case "checkout.session.completed":
    if (session.payment_status === "paid") {
      await query(
        "UPDATE orders SET status = $1 WHERE stripe_session_id = $2",
        ["paid", session.id]
      );
    }
    break;
}
```

**Why POST method?**

- Stripe actively sends data to our server
- Not a GET request where we query Stripe
- Webhook = "Stripe calls us" not "we call Stripe"

---

#### C. Created `/api/orders/session/[sessionId]/route.ts`

**Purpose:** Query order status for polling mechanism

**Implementation:**

```typescript
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params; // Next.js 15 requirement

  const result = await query(
    "SELECT id, status, email, total_cad FROM orders WHERE stripe_session_id = $1",
    [sessionId]
  );

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    ...
  });
}
```

**Next.js 15 Note:** `params` is now a Promise and must be awaited

---

### 3. Frontend Implementation

#### A. Modified `/cart/page.tsx`

**Changes:**

- Added `handleStripeCheckout` function
- Sends complete cart data (including product names) to `/api/checkout`
- Redirects to Stripe hosted payment page using `window.location.href`

**Key code:**

```typescript
const data = await res.json();
window.location.href = data.url; // Redirect to Stripe
```

---

#### B. Modified `/checkout/success/page.tsx`

**Implemented polling mechanism to check order status**

**Initial Implementation (Had Bugs):**

```typescript
// ❌ BUGGY VERSION - caused infinite loops
useEffect(() => {
  const timerId = setInterval(checkOrderStatus, 2000);
  return () => clearInterval(timerId);
}, [sessionId, status, attemptCount]); // Problem: dependencies cause re-runs
```

**Final Implementation (Fixed):**

```typescript
useEffect(() => {
  if (!sessionId) return;

  let isMounted = true;
  let timerId: NodeJS.Timeout;

  const checkOrderStatus = async () => {
    if (!isMounted) return;

    setAttemptCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 15) clearInterval(timerId);
      return newCount;
    });

    const data = await res.json();
    setError(null); // Clear previous errors
    setStatus(data.status);

    if (data.status === "paid") {
      clearInterval(timerId);
    }
  };

  checkOrderStatus();
  timerId = setInterval(checkOrderStatus, 2000);

  return () => {
    isMounted = false;
    clearInterval(timerId);
  };
}, [sessionId]); // Only depends on sessionId
```

**Display Logic:**

- Pending + attempts < 15: Show "⏳ Confirming payment..."
- Paid: Show "✅ Payment Successful!" with Order ID
- Pending + attempts >= 15: Show timeout warning
- Error: Show error message

---

### 4. Local Development Setup

#### Stripe CLI Installation & Configuration

**Purpose:** Forward Stripe webhooks to localhost during development

**Windows Installation:**

```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Start webhook forwarding:**

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Environment Variables:**

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe CLI output
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Important:** Restart Next.js dev server after updating `.env.local`

---

## Technical Architecture

### Complete Payment Flow

```
1. User clicks "Checkout" button
   ↓
2. Frontend sends cart data to POST /api/checkout
   ↓
3. Backend:
   - Calls Stripe API to create Checkout Session
   - Creates order in DB with status='pending'
   - Returns session.url
   ↓
4. Frontend redirects to Stripe payment page (window.location.href)
   ↓
5. User enters card info and completes payment on Stripe
   ↓
6. Two things happen simultaneously:

   A. Stripe redirects user to /checkout/success?session_id=xxx
      ↓
      Success page starts polling every 2 seconds
      ↓
      Calls GET /api/orders/session/{sessionId}
      ↓
      Displays status

   B. Stripe sends webhook to POST /api/webhooks/stripe
      ↓
      Webhook verifies signature
      ↓
      Updates order: status='pending' → 'paid'
      ↓
      Next poll detects status='paid'
      ↓
      Shows "Payment Successful!"
```

---

## Key Learning Points

### 1. Security Concepts

**Why two API keys?**

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Safe to expose in frontend (limited permissions)
- `STRIPE_SECRET_KEY`: Must stay on server (full access to Stripe account)

**Why verify webhook signatures?**

- Prevent spoofed requests pretending to be Stripe
- Uses cryptographic signature with shared secret
- Stripe SDK handles verification: `stripe.webhooks.constructEvent()`

**Why validate prices on backend?**

- Frontend can be manipulated via browser DevTools
- Users could change prices before checkout
- Backend should be the "source of truth"

---

### 2. Asynchronous Payment Confirmation

**Understanding the timing:**

```
User clicks Pay → Payment processes (1-2s) → Two events:
├─→ Browser redirect (immediate)
└─→ Webhook sent (1-5s typically)
```

**Why polling is necessary:**

- Frontend doesn't know when webhook arrives
- Can't directly listen to webhook (server-to-server)
- Polling bridges the gap between redirect and webhook processing

**Polling strategy:**

- Check every 2 seconds
- Stop after 15 attempts (30 seconds timeout)
- Stop immediately when status='paid'

---

### 3. React useEffect Deep Dive

**The Infinite Loop Bug:**

**Problem:** Including state that changes inside the effect in the dependency array

```typescript
// ❌ Creates infinite loop
useEffect(() => {
  setCount(count + 1);
}, [count]); // count changes → effect reruns → count changes → ...
```

**Solution:** Only depend on values that don't change

```typescript
// ✅ Runs once
useEffect(() => {
  setCount((prev) => prev + 1);
}, []); // No dependencies
```

**In our polling implementation:**

- `status` and `attemptCount` change during polling
- Including them in dependencies causes effect to restart
- Timers get cleared and recreated constantly
- Solution: Only depend on `sessionId` (never changes)

**Closure trap in timers:**

```typescript
const [status, setStatus] = useState("pending");

useEffect(() => {
  const timer = setInterval(() => {
    console.log(status); // Always "pending" - stale closure!
  }, 1000);
}, []);
```

**Solution:** Use fresh values from API response, not state

```typescript
const data = await fetch(...);
if (data.status === "paid") { // Use fresh value
  clearInterval(timer);
}
```

---

### 4. Next.js 15 Changes

**Dynamic Route Parameters:**

```typescript
// ❌ Old way (Next.js 14)
export async function GET(req, { params }) {
  const { id } = params;
}

// ✅ New way (Next.js 15)
export async function GET(
  req,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Must await
}
```

---

## Issues Encountered & Solutions

### Issue 1: WSL Network Isolation

**Problem:** Stripe CLI in WSL couldn't connect to Next.js on Windows

```
[ERROR] Failed to POST: dial tcp 127.0.0.1:3000: connect: connection refused
```

**Root Cause:**

- WSL's `localhost` ≠ Windows's `localhost`
- Network namespaces are isolated

**Solution:** Run both Stripe CLI and Next.js in same environment (both on Windows native)

---

### Issue 2: Polling Never Stops

**Problem:** Success page continues polling even after payment confirmed

**Root Cause:**

```typescript
useEffect(() => {
  // ...
}, [sessionId, status, attemptCount]);
// status changes → effect restarts → timer recreated → loop continues
```

**Solution:** Remove changing dependencies, use fresh values from API

---

### Issue 3: Error Messages Persist

**Problem:** Network error shown once, never clears even after successful queries

**Root Cause:** React state doesn't auto-clear

```typescript
setError("Network error"); // Sets error
// Later...
setStatus("paid"); // Error still exists!
```

**Solution:** Explicitly clear error on success

```typescript
if (success) {
  setError(null); // Must explicitly clear
}
```

---

## Testing Checklist

✅ Add products to cart  
✅ Click checkout → redirects to Stripe  
✅ Enter test card: `4242 4242 4242 4242`  
✅ Complete payment  
✅ Verify redirect to success page  
✅ Verify polling shows "Confirming..."  
✅ Verify status changes to "Payment Successful!" with Order ID  
✅ Check Stripe CLI logs for webhook events  
✅ Verify database: order status = 'paid'

**Cancel flow:**  
✅ Start checkout → Cancel on Stripe page → Returns to /cart

---

## Current Limitations & Future Improvements

**Current state:**

- ⚠️ Trusts frontend-provided prices (security issue)
- ⚠️ No `paid_at` timestamp tracking
- ⚠️ Polling could be replaced with Server-Sent Events (more efficient)
- ⚠️ No user authentication (all orders use test email)

**Next steps:**

- Implement database price validation
- Add user authentication system
- Improve error handling and retry logic
- Add order confirmation emails
- Implement refund handling

---

## Status

✅ **Functional for learning and testing**  
⚠️ **Not production-ready** - requires:

- Database price validation
- User authentication
- Real email confirmation
- Better error handling

Version 3A:
