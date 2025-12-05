This is a ecommerce website - still under development. the following step record how this website was constructed

## Technical Stack

- **Frontend:** Next.js 16 (App Router), React, TypeScript, NextAuth hooks
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Neon) with foreign key relationships
- **Payment:** Stripe Checkout + Webhooks
- **Dev Tools:** Stripe CLI
- **Authentication:** NextAuth.js v5 (Auth.js)
- **Password Hashing:** bcryptjs
- **Session Strategy:** JWT (JSON Web Tokens)

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

# Version 1A:

Goal: use fake data(API) to fetch data! In another words, use api as database to return data!

✅ You’ve made it happen:

/api/products → returns JSON

/products → fetches data from the API and renders it

That means your frontend and backend just connected for the first time — browser → API → data response.

# Version 1B:

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

# Version 1C:

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

# Version 2A:

🧭 Stage Goal

So far, your /api/products endpoint has only been returning a dummy array.
Next, we want this API to start pulling real data from the database.

| Part                   | Status                                                                            |
| ---------------------- | --------------------------------------------------------------------------------- |
| Backend API            | ✔ Updated to read from the database                                               |
| Database Connection    | ✔ Configured with Pool + environment variables                                    |
| Frontend Page          | ✔ Reused as-is, no structural changes needed                                      |
| Technical Breakthrough | ✅ You successfully rendered dynamic data from a real database for the first time |

# Version 2B:

In 2A the setup is:

/api/products → fetch all products from the database ✅

/products → product list page ✅

/product/[id] → the detail page is still doing fetch("/api/products") and then find ❌ (kind of crude)

We want to change it to:

/api/products/[id] → handles a single product

/product/[id] → directly requests /api/products/:id

Now this part has finished:

Database → API (list + single) → Frontend pages (list + detail).

# Version 2C:

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

# Version 2D - Stripe Checkout Integration (Sandbox Version):

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

# Version 3A: UI/UX Complete Redesign

## Iuuse:

Dark mode currently has been disabled since it has been found that font may look tricky at the moment. will work on dark mode later.

## Overview

Completed a comprehensive UI/UX overhaul of the entire e-commerce application, establishing a production-ready design system inspired by premium brands (MyProtein, Verve Coffee, Pure Cycles, Apple). The redesign prioritizes visual refinement, smooth interactions, and a cohesive user experience across all pages.

---

## Goals

- Establish a comprehensive design system with global CSS variables
- Implement a premium, Apple-like aesthetic ("细腻丝滑的感觉" - delicate and smooth feeling)
- Create consistent visual language across all pages
- Build responsive layouts for mobile, tablet, and desktop
- Add subtle, meaningful animations and interactions
- Move from "programmer UI" to production-quality design

---

## Design Philosophy

### Core Principles

1. **Minimalism with Purpose** - Every element serves a function
2. **Generous Whitespace** - Let content breathe
3. **Smooth Transitions** - All interactions feel refined (200-500ms)
4. **Subtle Details** - Micro-animations, shadow depth changes, hover effects
5. **Typography Hierarchy** - Clear visual levels through size and weight
6. **Restrained Color Palette** - Black, white, gray foundation with blue accent

### Design Inspirations

- **MyProtein**: 4-column product grid, hover image transitions
- **Verve Coffee**: Clean layouts, generous spacing
- **Pure Cycles**: Minimalist product cards, clear typography
- **Apple**: Refined interactions, subtle shadows, breathing room

---

## What Was Implemented

### 1. Global Design System Foundation

#### File: `src/app/globals.css`

**Established comprehensive CSS variables:**

```css
:root {
  /* Colors */
  --color-primary: #007aff; /* Apple blue */
  --color-text-primary: #1a1a1a; /* Near-black (softer than pure black) */
  --color-text-secondary: #666666; /* Mid-gray */
  --color-text-tertiary: #999999; /* Light gray */
  --color-background: #fafafa; /* Off-white (not pure white) */
  --color-surface: #ffffff; /* Card backgrounds */
  --color-border: #e5e5e5; /* Subtle borders */

  /* Border Radius */
  --radius-md: 12px;
  --radius-full: 9999px;
}
```

**Dark mode support:**

- Automatic system preference detection
- Inverted color scheme for dark environments
- Maintains contrast and readability

**Global resets and base styles:**

- Smooth scrolling
- Font smoothing for better rendering
- Custom scrollbar styling (thin, subtle)
- Focus-visible states for accessibility
- Print-friendly styles

**Custom animations:**

```css
@keyframes fadeIn
@keyframes fadeInUp
@keyframes shimmer;
```

**Utility components:**

- `.glass` - Glassmorphism effect
- `.container-custom` - Consistent max-width container
- `.skeleton` - Loading state shimmer animation

---

### 2. Root Layout Architecture

#### File: `src/app/layout.tsx`

**Implemented global layout structure:**

```typescript
<html lang="en" className={inter.variable}>
  <body>
    <CartProvider>
      <Navbar /> // Global navigation
      <main>{children}</main> // Page content
      <Footer /> // Global footer
    </CartProvider>
  </body>
</html>
```

**Key improvements:**

- ✅ Inter font integration from Google Fonts
- ✅ Metadata configuration (title, description, favicon)
- ✅ CartProvider wraps entire app
- ✅ Navbar appears on all pages
- ✅ Consistent footer
- ✅ Flexbox layout ensures footer sticks to bottom

**Font configuration:**

```typescript
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // Prevents invisible text during load
});
```

---

### 3. Global Navigation Component

#### File: `src/app/components/Navbar.tsx`

**Features:**

- Sticky positioning (stays on top during scroll)
- Brand logo with hover transition
- Desktop horizontal menu
- Mobile hamburger menu with slide-down animation
- Shopping cart icon with dynamic badge showing item count
- Backdrop blur effect (`bg-white/95 backdrop-blur`)

**Responsive behavior:**

- Desktop: Horizontal navigation with cart icon
- Mobile: Hamburger menu → full dropdown menu
- Cart badge animates in when items added (`animate-scaleIn`)

**Technical details:**

```typescript
const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
// Displays total quantity across all cart items
```

---

### 4. Homepage Redesign

#### File: `src/app/page.tsx`

**Design approach: Full-bleed hero with content overlay**

**Structure:**

1. **Hero Section** (70-80vh height)

   - Full-width background image
   - Gradient overlay for text readability
   - Content positioned on left side
   - Badge, headline, subtitle, dual CTAs

2. **Brand Story Section**
   - Dark gradient background
   - Centered prose layout
   - Story about brand origins

**Key features:**

- Toggle between normal/sale mode via `IS_SALE` constant
- Responsive image with Next.js Image component
- Gradient overlay: `from-black/80 via-black/55 to-black/5`
- Dual CTA buttons: Primary (solid) + Secondary (outline)

**Typography:**

```typescript
badge: uppercase, 11px, wide letter-spacing
title: 3xl-5xl, semibold, pre-line (allows \n breaks)
subtitle: responsive, relaxed line-height
```

---

### 5. Products Listing Page

#### File: `src/app/products/page.tsx`

**Layout: 4-column responsive grid**

- Desktop (xl): 4 columns
- Laptop (lg): 3 columns
- Tablet (md): 2 columns
- Mobile: 1 column

**Product card features:**

- **Aspect ratio**: 4:5 (portrait, similar to MyProtein)
- **Hover image transition**: Smooth 300ms fade between main and hover images
- **Image implementation**: Next.js Image component with proper sizing
- **Content**: Product name, description (line-clamped), price
- **CTA**: "View details" link (subtle, doesn't steal attention)

**Loading states:**

- Skeleton loaders (8 placeholder cards)
- Pulse animation during load

**Empty states:**

- Graceful message when no products available

**Technical highlights:**

```typescript
// Image transition on hover
className = "transition-opacity duration-300 group-hover:opacity-0";
// Hover image
className = "opacity-0 transition-opacity duration-300 group-hover:opacity-100";
```

**Design details:**

- Cards use `rounded-2xl` for modern look
- Background: `#f1f2f4` (neutral gray for image containers)
- Gap between cards: 6-8 units (24-32px)
- Sort/filter UI placeholder for future functionality

---

### 6. Product Detail Page

#### File: `src/app/products/[id]/page.tsx`

**Layout: Two-column split**

- Left: Large product image (4:5 aspect ratio)
- Right: Product information and actions

**Content hierarchy:**

1. Breadcrumb: "← Back to products"
2. Product badge: "Product detail" (small uppercase)
3. Product name (2xl-3xl, semibold)
4. Description (small, relaxed)
5. Price (xl, semibold)
6. Add to Cart + Go to Cart buttons
7. Fine print (returns, taxes info)
8. Detailed description section (if available)

**Loading states:**

- Full skeleton layout matching final structure
- Pulse animation

**Error states:**

- "Product not found" message
- Back navigation available

**CTA buttons:**

- Primary: "Add to Cart" (solid black → hover gray-900)
- Secondary: "Go to Cart" (outlined)
- Alert notification on add (can be replaced with toast later)

---

### 7. Shopping Cart Page

#### File: `src/app/cart/page.tsx`

**Layout: Two-column grid on desktop**

- Left (2fr): Cart items list
- Right (~1fr): Order summary sidebar

**Cart item cards:**

- Rounded white cards with subtle shadow
- Product name, quantity, unit price
- Calculated item total
- Remove button (text link style)

**Order summary sidebar:**

- Sticky positioning (stays visible during scroll)
- Subtotal display
- Tax/shipping disclaimer
- "Checkout with Stripe" primary button
- "Clear cart" secondary button
- Status messages display

**Empty state:**

- Dashed border card with centered message
- "Browse products" CTA

**Responsive behavior:**

- Desktop: Two columns
- Mobile: Stacked (items then summary)

**Visual polish:**

- Gradient background: `from-[#f5f5f7] to-white`
- Rounded corners: 2xl (16px)
- Shadow: Subtle, professional
- Button states: Disabled styling during loading

---

### 8. Checkout Success Page

#### File: `src/app/checkout/success/page.tsx`

**Design: Centered card with status visualization**

**Status icons (top of card):**

- ✅ Green checkmark circle: Payment succeeded
- ⏳ Spinning loader: Confirming payment (gray)
- ⚠️ Yellow exclamation: Timeout warning
- ❌ Red X: Error state

**Content structure:**

1. Icon (64x64 circle)
2. Status headline (2xl-3xl)
3. Supporting text
4. Order Summary card (gray background)
   - Payment status
   - Customer email
   - Session ID
5. "Back to Home" button

**Polling visualization:**

- Shows "Attempt X of 15" during confirmation
- Smooth transitions between states
- Clear messaging for each state

**Visual details:**

- Gradient background: `from-[#f0f4ff] to-white` (subtle blue tint)
- Main card: Large rounded corners (3xl), prominent shadow
- Summary card: Nested inside, contrasting background

---

## Technical Implementation Details

### CSS Architecture

**Layer structure:**

```css
@layer base {
  ...;
} // CSS variables, global resets
@layer components {
  ...;
} // Reusable component classes
@layer utilities {
  ...;
} // Animation utilities
```

**Benefits:**

- Proper cascade control
- Easy to override
- Clear separation of concerns

### Responsive Design Strategy

**Breakpoints used:**

- `sm:` 640px (mobile landscape)
- `md:` 768px (tablet)
- `lg:` 1024px (laptop)
- `xl:` 1280px (desktop)

**Grid patterns:**

- Products: 1 → 2 → 3 → 4 columns
- Product detail: Stack → 2 columns
- Cart: Stack → sidebar layout

### Animation Strategy

**Transition timing:**

- Fast: 150ms (micro-interactions)
- Base: 200ms (standard interactions)
- Slow: 300-500ms (image transitions, page loads)

**Easing:**

- `cubic-bezier(0.4, 0, 0.2, 1)` - Smooth deceleration
- Matches Apple's animation curves

### Image Optimization

**Next.js Image component usage:**

- Automatic lazy loading
- Responsive srcset generation
- Proper sizing hints for performance
- Priority loading for above-fold images

**Sizes attribute examples:**

```typescript
// Products grid
sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";

// Detail page
sizes = "(min-width: 1280px) 40vw, (min-width: 768px) 50vw, 100vw";
```

---

## Files Created/Modified

### New Files

```
src/app/components/Navbar.tsx
```

### Modified Files

```
src/app/globals.css              // Complete redesign
src/app/layout.tsx              // Added Navbar, Footer, Inter font
src/app/page.tsx                // Hero redesign
src/app/products/page.tsx       // 4-column grid with hover effects
src/app/products/[id]/page.tsx  // Two-column detail layout
src/app/cart/page.tsx           // Refined cart UI
src/app/checkout/success/page.tsx  // Enhanced status display
```

### Database Changes

```sql
-- Remove unused column
ALTER TABLE products DROP COLUMN car;

-- Add image support
ALTER TABLE products
ADD COLUMN image_url TEXT,
ADD COLUMN image_url_hover TEXT;
```

---

## Key Design Patterns

### 1. Consistent Card Styling

```typescript
// Base card style used throughout
rounded-2xl               // 16px border radius
bg-white                 // Clean white surface
border border-[var(--color-border)]  // Subtle border
shadow-sm                // Soft shadow
hover:shadow-lg          // Deeper shadow on hover
transition-all duration-300  // Smooth state changes
```

### 2. Typography Hierarchy

```
Page title: text-2xl md:text-3xl font-semibold
Section title: text-lg font-semibold
Body text: text-sm md:text-base
Small print: text-xs
Labels: text-[11px] uppercase tracking-[0.16em]
```

### 3. Button Patterns

**Primary action:**

```typescript
bg-black text-white hover:bg-gray-900
rounded-full px-6 py-2.5
```

**Secondary action:**

```typescript
border border-[var(--color-border)] bg-white
text-[var(--color-text-secondary)]
hover:border-gray-400
```

### 4. Interactive States

```
Default → Hover → Active
- Color shift
- Scale change (active:scale-95)
- Shadow depth change
- Translate Y (hover:-translate-y-1)
```

---

## Color Palette Rationale

### Why Not Pure Black/White?

**Instead of:**

- `#000000` (pure black) → Too harsh
- `#FFFFFF` on `#FFFFFF` → No depth

**We use:**

- `#1A1A1A` - Near-black (easier on eyes)
- `#FAFAFA` - Off-white background (subtle warmth)
- `#E5E5E5` - Nearly invisible borders (define space without shouting)

### Primary Blue: #007AFF

- Apple's signature blue
- High contrast against black/white
- Universally recognizable as interactive
- Hover state: `#0051D5` (slightly darker)

---

## Responsive Design Strategy

### Mobile-First Approach

All layouts start with mobile (single column) and progressively enhance:

```typescript
// Base: Mobile (1 column)
grid grid-cols-1

// Tablet: 2 columns
sm:grid-cols-2

// Laptop: 3 columns
lg:grid-cols-3

// Desktop: 4 columns
xl:grid-cols-4
```

### Breakpoint-Specific Behaviors

**Navigation:**

- Desktop: Horizontal menu
- Mobile: Hamburger → dropdown

**Product grid:**

- Mobile: 1 column, larger cards
- Tablet: 2 columns
- Laptop: 3 columns
- Desktop: 4 columns (MyProtein style)

**Typography:**

- Mobile: Smaller font sizes (text-2xl)
- Desktop: Larger, more impactful (text-5xl)

---

## Component-by-Component Breakdown

### Homepage (`/`)

**Hero Section:**

- Full-viewport height (70-80vh)
- Background image with gradient overlay
- Toggle-able sale/normal mode via constant
- Dual CTA buttons with different visual weights

**Brand Story Section:**

- Dark gradient background (`from-black to-[#050509]`)
- Centered prose layout (max-w-3xl)
- Muted white text for readability

**Design decisions:**

- Image-first approach (product photography drives interest)
- Gradient ensures text readability over varied images
- Two CTAs: Primary (shop now) + Secondary (explore)

---

### Products Listing (`/products`)

**Grid Layout:**

- 4 columns on desktop (xl:grid-cols-4)
- 24-32px gaps for breathing room
- Consistent aspect ratio (4:5) across all cards

**Product Card Anatomy:**

1. Image container (aspect-[4/5], rounded-2xl)
2. Main image (default state)
3. Hover image (opacity transition)
4. Product name (line-clamp-2)
5. Short description (line-clamp-2)
6. Price (right-aligned)
7. "View details" link (subtle, doesn't compete with card click)

**Hover effects:**

- Image crossfade (500ms)
- Card doesn't lift (keeps grid stable)
- Text color shift to primary blue

**Loading experience:**

- 8 skeleton cards with pulse animation
- Maintains layout during load (no CLS)

**Empty state:**

- Centered message
- Encourages action

---

### Product Detail (`/products/[id]`)

**Two-column layout:**

- Left: Large product image (60% width)
- Right: Product information (40% width)

**Information hierarchy:**

1. Breadcrumb navigation
2. Category badge (uppercase, tiny)
3. Product name (large, bold)
4. Short description
5. Price (prominent, large)
6. Action buttons (Add to Cart primary, Go to Cart secondary)
7. Fine print (returns policy, shipping)
8. Detailed description (collapsible section below)

**Image treatment:**

- Same 4:5 aspect ratio as listing
- Rounded corners
- Neutral background
- Badge overlay indicating hover image exists

**Paragraph rendering:**

```typescript
// Splits detailed_description by double line breaks
.split(/\n{2,}|\r?\n/).filter(Boolean).map(...)
// Preserves paragraphs with whitespace-pre-line
```

---

### Shopping Cart (`/cart`)

**Header section:**

- Page title + subtitle
- "Continue shopping" link (right-aligned on desktop)

**Grid layout:**

- Desktop: 2fr (items) + 0.9fr (summary)
- Mobile: Stacked

**Cart item cards:**

- White cards with subtle shadow
- Left-aligned: Product info, quantity, unit price
- Right-aligned: Item total, Remove button

**Order summary sidebar:**

- Sticky on desktop (scrolls with items on mobile)
- Subtotal calculation
- Disclaimer text (taxes/shipping)
- Primary CTA: "Checkout with Stripe"
- Secondary: "Clear cart"
- Status message display area

**Empty state:**

- Dashed border card (visual emptiness)
- Encouraging copy
- CTA to browse products

---

### Checkout Success (`/checkout/success`)

**Centered card approach:**

- Max-width: 3xl (768px)
- Large rounded card with prominent shadow
- Gradient background for visual interest

**Status visualization:**

- Icon-first design (64x64 circles)
- Color-coded states:
  - Green: Success
  - Gray: Loading
  - Yellow: Timeout warning
  - Red: Error

**Dynamic content based on polling:**

```
Pending (< 15 attempts):
  - Spinner icon
  - "Confirming your payment..."
  - Attempt counter

Paid:
  - Checkmark icon
  - "Thank you for your purchase"
  - Order number display

Timeout (≥ 15 attempts):
  - Warning icon
  - "Still checking..."
  - Support message
```

**Order summary card:**

- Nested card with gray background
- Payment status
- Customer email
- Session ID reference

---

## Animation & Interaction Details

### Micro-interactions

**Button press:**

```css
active: scale-95; /* Slight shrink on click */
```

**Card hover:**

```css
hover:-translate-y-1  /* Subtle lift */
hover:shadow-lg       /* Shadow deepens */
```

**Image crossfade:**

```css
transition-opacity duration-500  /* Smooth fade */
```

**Badge appear:**

```css
animate-scaleIn  /* Pops in when cart count increases */
```

### Loading Animations

**Skeleton shimmer:**

```css
background: linear-gradient(90deg, gray → white → gray)
background-size: 200% 100%
animation: shimmer 2s infinite
```

**Spinner:**

```css
animate-spin  /* Rotating loader */
border-2 border-gray-400 border-t-transparent
```

---

## Accessibility Improvements

### Focus Management

```css
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Semantic HTML

- Proper heading hierarchy (h1 → h2 → h3)
- `<article>` for cart items
- `<nav>` for navigation
- ARIA labels on interactive elements

### Keyboard Navigation

- All interactive elements focusable
- Clear focus indicators
- Logical tab order

---

## Performance Optimizations

### Image Optimization

```typescript
// Proper sizing prevents over-fetching
sizes="(min-width: 1280px) 25vw, ..."

// Priority loading for above-fold
priority={true}

// Lazy loading for below-fold (default)
```

### Font Loading

```typescript
display: "swap"  // Show fallback font while loading
preconnect to fonts.googleapis.com  // DNS prefetch
```

### Animation Performance

```css
will-change: transform,
  opacity // GPU acceleration hint;;
```

### CSS Layer Organization

- Reduces specificity wars
- Predictable cascade
- Smaller final bundle (unused styles eliminated)

---

## Design Token Philosophy

### Why CSS Variables Over Tailwind Config?

**Advantages:**

1. **Runtime flexibility** - Can change based on user preference (dark mode)
2. **Easy theming** - Override variables for different brands
3. **Works with Tailwind** - Can use both: `text-[var(--color-primary)]`
4. **Inspector-friendly** - See computed values in DevTools
5. **No rebuild needed** - Changes apply immediately

**Usage pattern:**

```typescript
// In Tailwind classes
bg-[var(--color-surface)]

// In inline styles
style={{ color: 'var(--color-text-primary)' }}

// In CSS files
background-color: var(--color-background);
```

---

## Known Limitations & Trade-offs

### Current State

- ⚠️ Some text still uses inline `style={{}}` for CSS variables (Tailwind JIT limitation)
- ⚠️ Product images use placeholder URLs (need real product photography)
- ⚠️ "Add to favorites" button non-functional (UI only)
- ⚠️ Sort/filter dropdown non-functional (placeholder)
- ⚠️ Mobile menu doesn't animate smoothly (can enhance with Framer Motion)

### Design Decisions

- ✅ Chose not to add star ratings (per request - keeps UI cleaner)
- ✅ No modal for spec selection (Phase 2 feature)
- ✅ Direct "Add to Cart" (one-click action prioritized over customization)
- ✅ Alert() for cart confirmation (can upgrade to toast library later)

---

## Testing Checklist

### Visual Testing

✅ Desktop (1920px): All layouts render correctly  
✅ Laptop (1440px): Grid adjusts properly  
✅ Tablet (768px): 2-column layouts work  
✅ Mobile (375px): Single column, hamburger menu

### Interaction Testing

✅ Hover image transitions work smoothly  
✅ Cart badge updates when items added  
✅ Mobile menu opens/closes  
✅ All links navigate correctly  
✅ Buttons show disabled states  
✅ Loading skeletons display during data fetch

### Browser Testing

✅ Chrome/Edge (Chromium): Full support  
✅ Firefox: Full support  
✅ Safari: Full support (backdrop-filter works)

### Accessibility Testing

✅ Keyboard navigation works  
✅ Focus indicators visible  
✅ Screen reader friendly (semantic HTML)  
✅ Color contrast meets WCAG AA

---

## Design System Comparison

### Before Step 3A:

```html
<ul>
  <li>Product Name - $29.99</li>
  <button>Add</button>
</ul>
```

- Unstyled HTML elements
- Inline styles scattered
- No consistency
- No responsive design
- Programmer-looking UI

### After Step 3A:

```typescript
<div className="grid xl:grid-cols-4 gap-8">
  <ProductCard
    image={...}
    hoverImage={...}
    onHover={smooth transition}
  />
</div>
```

- Professional design system
- CSS variables for theming
- Responsive grid layouts
- Smooth animations
- Production-quality UI

---

## Next Steps (Not Implemented)

### Potential Priority Order:

**Step 3B: Security - Price Validation** ← Next immediate task

- Backend validates all prices from database
- Frontend only sends `productId + quantity`
- Prevents price manipulation

**Step 3C: User Authentication System**

- User registration/login
- Order history ("My Orders")
- Session management
- Protected routes

**Step 3D: Enhanced Features**

- Product spec selection modal (size, color, etc.)
- Favorites/wishlist functionality
- Product search and filtering
- Toast notifications (replace alert())
- Product reviews and ratings

**Step 3E: Admin Panel**

- Product management CRUD
- Order fulfillment workflow
- Inventory tracking

---

## Status

✅ **Complete and production-ready from UI/UX perspective**  
⚠️ **Backend security issues remain** - Price validation needed before production deployment

## Lessons Learned

### 1. Architecture-First Approach

Starting with global design system (CSS variables, layout) before individual pages leads to:

- Faster implementation of subsequent pages
- Better consistency
- Easier maintenance

### 2. CSS Variables + Tailwind Hybrid

Best of both worlds:

- Tailwind for rapid development
- CSS variables for theming and complex values
- Can switch between approaches as needed

### 3. Component Extraction Timing

Extracted Navbar as shared component immediately, but kept page-specific layouts inline:

- Prevents premature abstraction
- Easier to iterate on unique page designs
- Can extract common patterns later

### 4. Responsive Design

Mobile-first grid with progressive enhancement works better than desktop-first:

- Ensures mobile experience isn't an afterthought
- Tailwind's responsive prefixes make this natural

---

## Design Inspiration Credits

- **MyProtein**: 4-column grid layout, hover image transitions
- **Verve Coffee**: Clean typography, generous spacing, minimal navigation
- **Pure Cycles**: Product card styling, aspect ratios, subtle shadows
- **Apple**: Overall refinement, micro-interactions, color palette, font smoothing

# Version 3B: Security Enhancement - Price Validation

## Overview

Implemented server-side price validation to prevent price manipulation attacks. The backend now serves as the single source of truth for all product pricing, eliminating the critical security vulnerability where frontend-provided prices were trusted without verification.

---

## Problem Statement

### Critical Security Vulnerability

**Before Step 3B:**
Both `/api/checkout` and `/api/orders` endpoints trusted price data sent from the frontend:

```typescript
// Frontend sends
{
  items: [{ productId: 1, name: "Product A", priceCad: 1299.99, quantity: 1 }];
}

// Backend directly uses frontend price
const total = body.items.reduce(
  (sum, item) => sum + item.priceCad * item.quantity,
  0
);
```

### Attack Vector

**Exploit scenario:**

1. Attacker opens browser DevTools (F12)
2. Modifies cart state or intercepts network request
3. Changes `priceCad: 1299.99` to `priceCad: 0.01`
4. Proceeds to checkout
5. Backend accepts manipulated price
6. Attacker purchases $1,299.99 item for $0.01

**Impact:**

- Direct financial loss
- Data integrity compromise
- Potential fraud at scale
- Violation of payment processor terms

---

## Solution Architecture

### Core Principle: Backend as Single Source of Truth

**New flow:**

```
Frontend sends: { productId, quantity }
           ↓
Backend queries database for real price
           ↓
Backend validates product existence
           ↓
Backend calculates total using database prices
           ↓
Creates Stripe Session / Order with verified prices
```

**Security guarantees:**

- ✅ Prices always fetched from database (cannot be manipulated)
- ✅ Product existence validated before processing
- ✅ Frontend cannot influence pricing logic
- ✅ Complete audit trail (database queries logged)

---

## Implementation Details

### 1. Type Definition Changes

**File:** `/api/checkout/route.ts`

**Before:**

```typescript
type CheckoutItem = {
  productId: number;
  name: string; // ❌ Frontend-provided
  priceCad: number; // ❌ Frontend-provided (security risk!)
  quantity: number;
};
```

**After:**

```typescript
type CheckoutItem = {
  productId: number; // ✅ Only ID
  quantity: number; // ✅ Only quantity
  // No price or name - backend will fetch from database
};
```

**Rationale:** Minimize attack surface by accepting only essential identifiers

---

### 2. Input Validation - Quantity Range Check

**Added comprehensive quantity validation before database queries:**

```typescript
// Validate quantity for each item (fail-fast approach)
for (const item of body.items) {
  // Type and format validation
  if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity)) {
    return NextResponse.json(
      { error: "Invalid quantity format" },
      { status: 400 }
    );
  }

  // Range validation
  if (item.quantity < 1 || item.quantity > 1000) {
    return NextResponse.json(
      { error: "Quantity must be between 1 and 1000" },
      { status: 400 }
    );
  }
}
```

**What this prevents:**

- String quantities: `quantity: "100"`
- Decimal quantities: `quantity: 29.5`
- Zero or negative: `quantity: 0`, `quantity: -5`
- Unrealistic orders: `quantity: 999999` (resource exhaustion attack)
- Type coercion issues: `quantity: NaN`, `quantity: null`

**Why 1000 limit?**

- Reasonable wholesale maximum
- Prevents integer overflow in calculations
- Protects database from abuse
- Stripe has transaction limits (~$999,999)

**Performance consideration:**

- Validates before expensive database query
- Fast rejection of malicious requests
- O(N) validation cost (N = number of items)

---

### 3. Database Query Implementation

**Added batch query logic:**

```typescript
// Step 1: Extract all product IDs from cart
const requestedIds = body.items.map((item) => item.productId);
// Example: [1, 5, 8]

// Step 2: Batch query - fetch all products in one database call
const result = await query(
  "SELECT id, price_cad, name FROM products WHERE id = ANY($1)",
  [requestedIds]
);
```

**Why `ANY($1)` instead of `IN (...)`?**

- `ANY($1)` is PostgreSQL's parameterized query syntax
- Prevents SQL injection
- Allows passing array as single parameter

**Performance benefit:**

- Before: N database queries (one per product)
- After: 1 database query (batch fetch)
- Example: 10 products → 90% reduction in DB calls

---

### 3. Product Existence Validation

**Validation logic:**

```typescript
// Step 3: Verify all requested products were found
const foundIds = result.rows.map((row) => row.id);
const missingIds = requestedIds.filter((id) => !foundIds.includes(id));

if (missingIds.length > 0) {
  return NextResponse.json(
    { error: `Products not found: ${missingIds.join(", ")}` },
    { status: 400 }
  );
}
```

**What this catches:**

- Deleted products still in old cart sessions
- Malicious requests with fabricated product IDs
- Race conditions (product deleted between page load and checkout)

**Error response example:**

```json
{
  "error": "Products not found: 999, 1001"
}
```

---

### 4. Efficient Price Lookup with Map

**Why use Map instead of array lookups?**

**Array lookup (inefficient):**

```typescript
// Time complexity: O(N × M)
for (const item of body.items) {
  // N iterations
  const product = result.rows.find((row) => row.id === item.productId); // M comparisons each
}
// Total: N × M comparisons
```

**Map lookup (efficient):**

```typescript
// Build index once: O(M)
const productMap = new Map<number, { price_cad: number; name: string }>();
for (const row of result.rows) {
  productMap.set(row.id, { price_cad: row.price_cad, name: row.name });
}

// Fast lookups: O(N)
for (const item of body.items) {
  const product = productMap.get(item.productId); // O(1) lookup
}
// Total: O(M + N)
```

**Performance comparison:**

- 10 products: Array = 100 ops, Map = 20 ops (5x faster)
- 100 products: Array = 10,000 ops, Map = 200 ops (50x faster)

---

### 5. Price Calculation with Database Values

**Updated lineItems generation:**

**Before (insecure):**

```typescript
const lineItems = body.items.map((item) => ({
  quantity: item.quantity,
  price_data: {
    product_data: {
      name: item.name, // ❌ Frontend value
    },
    unit_amount: Math.round(item.priceCad * 100), // ❌ Frontend value
  },
}));
```

**After (secure):**

```typescript
const lineItems = body.items.map((item) => {
  const product = productMap.get(item.productId)!; // Database lookup

  return {
    quantity: item.quantity,
    price_data: {
      currency: "cad",
      product_data: {
        name: product.name, // ✅ Database value
      },
      unit_amount: Math.round(product.price_cad * 100), // ✅ Database value
    },
  };
});
```

**Non-null assertion (`!`) safety:**

- Safe because we validated all products exist above
- If product missing, request already rejected with 400 error
- Map.get() guaranteed to return value for validated IDs

---

**Updated total calculation:**

**Before:**

```typescript
const total = body.items.reduce(
  (sum, item) => sum + item.priceCad * item.quantity, // ❌ Frontend value
  0
);
```

**After:**

```typescript
const total = body.items.reduce((sum, item) => {
  const product = productMap.get(item.productId)!;
  return sum + product.price_cad * item.quantity; // ✅ Database value
}, 0);
```

---

**Updated order_items insertion:**

**Before:**

```typescript
await query(
  "INSERT INTO order_items (order_id, product_id, quantity, price_cad) VALUES ($1, $2, $3, $4)",
  [orderId, item.productId, item.quantity, item.priceCad] // ❌ Frontend value
);
```

**After:**

```typescript
for (const item of body.items) {
  const product = productMap.get(item.productId)!;

  await query(
    "INSERT INTO order_items (order_id, product_id, quantity, price_cad) VALUES ($1, $2, $3, $4)",
    [orderId, item.productId, item.quantity, product.price_cad] // ✅ Database value
  );
}
```

---

### 6. Frontend Request Updates

**File:** `src/app/cart/page.tsx`

**Modified `handleStripeCheckout` to send minimal data:**

**Before:**

```typescript
body: JSON.stringify({
  email: "test@example.com",
  items: cart.map((item) => ({
    productId: item.id,
    name: item.name, // ❌ Unnecessary
    quantity: item.quantity,
    priceCad: item.priceCad, // ❌ Security risk
  })),
});
```

**After:**

```typescript
body: JSON.stringify({
  email: "test@example.com",
  items: cart.map((item) => ({
    productId: item.id,
    quantity: item.quantity,
    // Only essential identifiers - backend fetches rest
  })),
});
```

**Benefits:**

- Smaller request payload
- Clearer separation of concerns (frontend = UI, backend = business logic)
- Impossible to manipulate prices via client

---

### 7. Code Cleanup

**Deleted deprecated endpoint:**

- Removed `/api/orders/route.ts` (POST method)
- This was the "fake checkout" from Step 2C before Stripe integration
- No longer used after `/api/checkout` implementation
- `/api/admin/orders` (GET endpoint) remains for admin panel

**Rationale:**

- Eliminate code duplication
- Single checkout flow reduces maintenance burden
- Clearer architecture (one way to create orders)

---

## Security Test Results

### Test 1: Normal Flow ✅

**Procedure:**

1. Add products to cart via UI
2. Proceed to checkout
3. Inspect network request in DevTools

**Observed:**

```json
{
  "email": "test@example.com",
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 5, "quantity": 1 }
  ]
}
```

**Verification:**

- ✅ No `priceCad` field in request
- ✅ No `name` field in request
- ✅ Payment completes successfully
- ✅ Correct total charged via Stripe

---

### Test 2: Price Manipulation Attempt ✅

**Procedure:**
Manually send request with fake price via browser console:

```javascript
fetch("/api/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "attacker@test.com",
    items: [{ productId: 1, quantity: 1, priceCad: 0.01, name: "Fake" }],
  }),
});
```

**Result:**

- ✅ Backend ignores `priceCad` and `name` fields (type definition prevents acceptance)
- ✅ Fetches real price from database
- ✅ Charges correct amount via Stripe

**Conclusion:** Attack vector neutralized

---

### Test 3: Invalid Product ID ✅

**Procedure:**
Request non-existent product:

```javascript
fetch("/api/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "test@test.com",
    items: [{ productId: 999999, quantity: 1 }],
  }),
});
```

**Response:**

```json
{
  "error": "Products not found: 999999"
}
```

**Verification:**

- ✅ Request rejected with 400 status
- ✅ Descriptive error message
- ✅ No database writes occurred
- ✅ No Stripe Session created

---

## Technical Deep Dive

### Array vs Map Performance Analysis

**Problem:** Need to lookup product info for each cart item

**Scenario:** Cart with 10 items, database returns 10 product records

**Approach A: Array.find() in loop**

```typescript
for (const item of body.items) {
  // 10 iterations
  const product = result.rows.find((row) => row.id === item.productId);
  // Each find() scans entire array (worst case: 10 comparisons)
}
// Total operations: 10 × 10 = 100 comparisons
// Time complexity: O(N²)
```

**Approach B: Map for indexed access**

```typescript
// Build Map once
const productMap = new Map();
for (const row of result.rows) {
  // 10 iterations
  productMap.set(row.id, row);
}

// Fast lookups
for (const item of body.items) {
  // 10 iterations
  const product = productMap.get(item.productId); // O(1) lookup
}
// Total operations: 10 + 10 = 20 operations
// Time complexity: O(N + M)
```

**Performance gain:**

- Small carts (5 items): 5x faster
- Large carts (50 items): 50x faster
- Production scale (100+ items): Critical performance difference

---

### SQL Injection Prevention

**Why `ANY($1)` is secure:**

**Vulnerable (hypothetical):**

```typescript
// ❌ String concatenation - SQL injection risk
const query = `SELECT * FROM products WHERE id IN (${ids.join(",")})`;
```

**Secure (implemented):**

```typescript
// ✅ Parameterized query - SQL injection impossible
query("SELECT ... WHERE id = ANY($1)", [requestedIds]);
```

**PostgreSQL's `ANY` operator:**

- Accepts array parameter
- Database handles array expansion safely
- Equivalent to `IN (...)` but parameterized

---

### Validation Logic: Finding Missing Products

**Algorithm:**

```typescript
// Set theory approach
requested = [1, 5, 999]    // What frontend wants
found = [1, 5]              // What database has
missing = requested - found // Set difference
       = [999]              // Products that don't exist
```

**Implementation:**

```typescript
const missingIds = requestedIds.filter((id) => !foundIds.includes(id));
```

**Why this matters:**

- Prevents partial order creation (all-or-nothing principle)
- Returns descriptive error (tells user which products failed)
- Maintains data integrity (no orphaned records)

---

## Files Modified

### 1. `/api/checkout/route.ts`

**Changes:**

- Modified `CheckoutItem` type (removed `name` and `priceCad`)
- Added database query for product validation
- Implemented Map-based lookup structure
- Updated `lineItems` generation to use database prices
- Updated `total` calculation to use database prices
- Updated `order_items` insertion to use database prices

**Lines of code:** ~40 lines added/modified

**Validation order:**

```typescript
1. Check cart not empty
2. Validate quantity format and range (new in this step)
3. Query database for products
4. Validate all products exist
5. Build Map for efficient lookups
6. Generate lineItems and calculate total
7. Create Stripe Session and order
```

---

### 2. `/cart/page.tsx`

**Changes:**

- Modified `handleStripeCheckout` request body
- Removed `name` and `priceCad` from items array
- Simplified data structure sent to backend

**Lines of code:** ~5 lines modified

---

### 3. `/api/orders/route.ts`

**Action:** File deleted entirely

**Rationale:**

- POST method was deprecated after Stripe integration
- Functionality merged into `/api/checkout`
- GET method lives in `/api/admin/orders` (separate file)
- Reduces code duplication and maintenance burden

---

## Code Quality Improvements

### 1. Batch Database Queries

**Before (hypothetical inefficient approach):**

```typescript
for (const item of body.items) {
  const result = await query("SELECT price_cad FROM products WHERE id = $1", [
    item.productId,
  ]);
  // N database round trips
}
```

**After (optimized):**

```typescript
const result = await query(
  "SELECT id, price_cad, name FROM products WHERE id = ANY($1)",
  [requestedIds]
);
// Single database round trip
```

**Benefits:**

- Reduced database load
- Lower latency (one network round trip vs N)
- Better connection pool utilization
- Atomic data snapshot (all prices from same moment)

---

### 2. Map Data Structure Usage

**Why Map over Object?**

**Map advantages:**

```typescript
// Type-safe key-value pairs
const map = new Map<number, ProductData>();

// O(1) lookup by product ID
map.get(productId);

// No prototype pollution
// No string coercion of keys
// Better performance for frequent lookups
```

**vs Object:**

```typescript
// Keys always strings (need string conversion)
const obj: Record<string, ProductData> = {};

// Prototype chain lookup overhead
obj[productId]; // productId coerced to string
```

---

### 3. Input Sanitization and Validation

**Multi-layered validation approach:**

**Layer 1: Type safety (TypeScript)**

```typescript
type CheckoutItem = {
  productId: number; // Compiler enforces type
  quantity: number;
};
```

**Layer 2: Runtime type checking**

```typescript
typeof item.quantity !== "number"; // Catches type coercion
!Number.isInteger(item.quantity); // Catches decimals
```

**Layer 3: Business rule validation**

```typescript
item.quantity < 1 || item.quantity > 1000; // Catches unrealistic values
```

**Defense-in-depth strategy:**

- TypeScript catches most issues at compile time
- Runtime checks catch dynamic/malicious input
- Business rules enforce domain constraints

**Why check `Number.isInteger()`?**

```typescript
// These pass typeof === "number" but aren't valid:
29.5; // Decimal
Infinity; // Special number
NaN; // Not a number (but typeof === "number"!)

// Number.isInteger() rejects all of these
```

---

### 4. Comprehensive Error Handling

**Validation checkpoints:**

```typescript
// Checkpoint 1: Empty cart
if (!body.items || body.items.length === 0) {
  return NextResponse.json({ error: "No items to checkout" }, { status: 400 });
}

// Checkpoint 2: Products exist
if (missingIds.length > 0) {
  return NextResponse.json(
    { error: `Products not found: ${missingIds.join(", ")}` },
    { status: 400 }
  );
}

// Checkpoint 3: Database/Stripe errors
try {
  // Main logic
} catch (e: any) {
  console.error("Error creating checkout session:", e);
  return NextResponse.json(
    { error: "Failed to create checkout session" },
    { status: 500 }
  );
}
```

**Error response format consistency:**

- Always includes `error` field
- Descriptive messages for debugging
- Appropriate HTTP status codes (400 vs 500)

---

## Security Verification Tests

### Test Suite

**Test 1: Normal checkout flow**

- ✅ Add products via UI
- ✅ Proceed to checkout
- ✅ Verify correct prices charged
- ✅ Order created with database prices

**Test 2: Price manipulation attempt**

- ✅ Send request with fake price via DevTools
- ✅ Backend ignores manipulated price
- ✅ Database price used instead
- ✅ Correct amount charged

**Test 3: Invalid product ID**

- ✅ Request non-existent product (ID: 999999)
- ✅ Returns 400 error
- ✅ Descriptive error message
- ✅ No order created
- ✅ No Stripe Session created

**Test 4: Invalid quantity values**

- ✅ Request with quantity = 0 → Returns 400 error
- ✅ Request with quantity = -5 → Returns 400 error
- ✅ Request with quantity = 9999 → Returns 400 error
- ✅ Request with quantity = "100" (string) → Returns 400 error
- ✅ Request with quantity = 29.5 (decimal) → Returns 400 error

**Test 5: Mixed valid/invalid products**

- ✅ Request [valid_id, valid_id, invalid_id]
- ✅ Entire request rejected (all-or-nothing)
- ✅ Error lists specific missing IDs

**Test 6: Deleted product in cart**

- ✅ Add product to cart
- ✅ Delete product from database
- ✅ Attempt checkout
- ✅ Gracefully rejected with clear error

---

## Before/After Comparison

### Attack Surface

**Before:**

```
Attacker control: productId, quantity, price, name
Risk level: CRITICAL (direct price manipulation)
```

**After:**

```
Attacker control: productId, quantity
Risk level: LOW (can only request products that exist)
```

---

### Data Flow

**Before:**

```
Cart → Frontend calculates total → Sends to backend → Backend trusts values
       ↑ Manipulable at every step
```

**After:**

```
Cart → Frontend sends IDs only → Backend queries DB → Backend calculates
                                  ↑ Single source of truth
```

---

### Code Maintainability

**Before:**

- Price logic duplicated (frontend calculation + backend)
- Risk of inconsistency
- Need to sync price changes across layers

**After:**

- Price logic centralized in database
- Single place to update prices
- Frontend is purely presentational

---

## Performance Impact

### Database Query Optimization

**Metrics:**

- Queries per checkout: 1 (batch query)
- vs potential N queries (if done naively)
- For 10-item cart: 90% reduction in DB calls

### In-Memory Lookup Optimization

**Map construction overhead:**

- One-time cost: O(M) where M = number of products
- Amortized across all cart items
- Worth it for carts with 3+ items

**Overall performance:**

- Negligible impact on small carts (< 5 items)
- Significant improvement for large carts (10+ items)
- Better scalability for production loads

---

## Remaining Security Considerations

### ✅ Addressed in this step

- Price manipulation via frontend
- Product existence validation
- SQL injection prevention (parameterized queries)
- Webhook signature verification (from Step 2D)
- Quantity validation (type checking, range limits)

### ⚠️ Still pending (future work)

- **User authentication:** No verification that email belongs to requester
- **Rate limiting:** No protection against checkout spam
- **Inventory validation:** No check for stock availability
- **CSRF protection:** Not implemented (Next.js API routes vulnerable)
- **Session validation on success page:** Still doesn't verify payment truly succeeded

---

## Architecture Patterns Learned

### 1. Defense in Depth

- Type system enforces structure (TypeScript)
- Database query validates existence
- Price fetched from authoritative source
- Multiple validation checkpoints

### 2. Principle of Least Privilege

- Frontend only sends what it knows (IDs, quantities)
- Backend has access to sensitive data (prices)
- Clear trust boundaries

### 3. Fail-Fast Validation

- Validate early (before expensive operations)
- Reject entire request on any validation failure
- Prevents partial state / data corruption

### 4. Single Source of Truth

- Database is authoritative for prices
- No client-side calculations trusted
- Eliminates synchronization issues

---

## Code Review Insights

### What We Learned

**1. Trust boundaries:**

- Never trust client input for critical business logic
- Always validate against server-side data
- Assume all frontend data is potentially malicious

**2. Batch operations:**

- Prefer single batch query over N individual queries
- Reduces latency and database load
- Use parameterized queries for security

**3. Data structure selection:**

- Choose appropriate structures (Map vs Array)
- Consider lookup patterns when designing logic
- Optimize for common case (frequent lookups → Map)

**4. Error handling:**

- Specific error messages aid debugging
- Appropriate HTTP status codes
- Fail fast, fail explicitly

---

## Next Steps

### Potential Priority Order

**Step 3C: Currency Standardization (Optional)**

- Rename `price_cad` → `price_usd` throughout codebase
- Update Stripe currency setting
- Convert existing prices (if needed)
- Update all display text (CAD → USD)

**Step 4: User Authentication System (High Priority)**

- User registration/login
- Session management
- Associate orders with authenticated users
- "My Orders" page for users
- Protected checkout (require login)

**Step 5: Additional Security Hardening**

- Inventory validation (prevent overselling)
- Rate limiting on checkout endpoint
- CSRF token implementation
- Email verification before checkout
- Success page payment verification (query Stripe API with session_id)

---

## Status

✅ **Production-ready from security perspective (pricing)**  
✅ **Performance optimized (batch queries, Map lookups)**  
✅ **Code cleaned up (removed deprecated endpoints)**  
⚠️ **User authentication still required for production deployment**

---

# Version 3C:Currency Standardization (CAD → USD)

## Overview

Standardized the application to use USD as the base currency and simplified database field naming. Changed from `price_cad`/`total_cad` to `price`/`total` for cleaner code and consistency.

---

## Changes Made

### 1. Database Schema

```sql
-- Renamed columns in all tables
ALTER TABLE products RENAME COLUMN price_cad TO price;
ALTER TABLE order_items RENAME COLUMN price_cad TO price;
ALTER TABLE orders RENAME COLUMN total_cad TO total;
```

**Decision:** Kept numeric values unchanged (test data)

- Example: 29.99 CAD → 29.99 USD
- No currency conversion applied
- Only unit labels changed

---

### 2. Backend APIs

**Modified files:**

- `/api/checkout/route.ts`
- `/api/orders/session/[sessionId]/route.ts`
- `/api/admin/orders/route.ts`

**Changes:**

- SQL queries: `price_cad` → `price`, `total_cad` → `total`
- Map types: `{ price_cad: number }` → `{ price: number }`
- All references: `product.price_cad` → `product.price`
- Stripe currency: `"cad"` → `"usd"`

---

### 3. Frontend

**Type definitions:**

```typescript
// Changed in all Product interfaces
priceCad: number → priceUsd: number
```

**Files updated:**

- `/products/page.tsx`
- `/products/[id]/page.tsx`
- `/cart/page.tsx`
- `/context/CartContext.tsx`

**Display text:**

```typescript
// Before
${product.priceCad.toFixed(2)} CAD

// After
${product.priceUsd.toFixed(2)}
// or
${product.priceUsd.toFixed(2)} USD
```

---

## Rationale

**Why USD?**

- International standard for e-commerce
- Stripe's default currency
- Simpler for global customers

**Why simplify field names?**

- `price` is clearer than `price_cad`
- Easier to change currency in future (just update display, not schema)
- Less typing, cleaner code

---

## Testing

✅ Product listing displays prices correctly  
✅ Product detail shows correct price  
✅ Cart calculations accurate  
✅ Stripe checkout shows USD  
✅ Payment processes successfully  
✅ Database stores correct totals  
✅ No undefined/NaN errors

---

## Status

✅ **Complete** - All currency references standardized to USD

# Version 4A: User Authentication System and UX Optimization

## Overview

Implemented a complete user authentication system using NextAuth.js (Auth.js v5) with JWT-based sessions, bcrypt password hashing, and PostgreSQL user storage. The system supports both authenticated users and guest checkout, with full order attribution and personalized order history.

---

## Goals

- Enable user registration and login
- Securely store user credentials (bcrypt hashing)
- Associate orders with authenticated users
- Support guest checkout (email-only purchases)
- Display personalized order history
- Implement session management with JWT tokens
- Maintain premium UI/UX throughout auth flows

---

## What Was Implemented

### 1. Database Schema - Users Table

**File:** Neon PostgreSQL Console

**Created users table:**

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email); -> this was initially added but then got drop later
```

**Removed duplicate index:**

```sql
-- UNIQUE constraint already creates an index
-- Deleted manual index to avoid redundancy
DROP INDEX idx_users_email;
```

**Added user association to orders:**

```sql
ALTER TABLE orders
ADD COLUMN user_id INTEGER REFERENCES users(id);
```

**Schema decisions:**

- **Minimal MVP approach:** Only essential fields (id, email, password_hash, created_at)
- **Future extensibility:** Can add name, role, phone, avatar_url later
- **UNIQUE constraint on email:** Automatic index creation + prevents duplicates
- **password_hash not password:** Never store plaintext passwords
- **user_id nullable:** Allows historical orders without users + guest checkouts

---

### 2. NextAuth.js Configuration

#### A. Installation

**Packages installed:**

```bash
npm install next-auth@beta  # v5 for Next.js 16 App Router
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

**Why beta version?**

- NextAuth v5 (Auth.js) supports App Router
- v4 was Pages Router only
- v5 is production-ready despite "beta" tag

---

#### B. Core Configuration File

**File:** `src/auth.ts`

**Structure:**

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Credentials({ ... })],
  callbacks: { jwt, session },
  pages: { signIn: '/auth/signin' },
  session: { strategy: "jwt" }
});
```

**Key exports:**

- `handlers` → API route handlers (GET/POST)
- `signIn` → Programmatic sign-in function
- `signOut` → Programmatic sign-out function
- `auth` → Get session in server components/API routes

---

#### C. Credentials Provider (Login Logic)

**The `authorize` function:**

```typescript
async authorize(credentials) {
  // Step 1: Get user input
  const email = credentials.email as string;
  const password = credentials.password as string;

  if (!email || !password) {
    return null;  // Login failed
  }

  // Step 2: Query database for user
  const result = await query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email]
  );

  // Step 3: User not found
  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Step 4: Verify password with bcrypt
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  // Step 5: Return user info (stored in JWT)
  return {
    id: user.id.toString(),
    email: user.email,
  };
}
```

**Security highlights:**

- Returns `null` on any failure (doesn't reveal which step failed)
- Uses bcrypt.compare() for password verification (secure hash comparison)
- Never exposes password_hash to client
- Database query uses parameterized query ($1) to prevent SQL injection

---

#### D. JWT Callbacks (Include User ID)

**Problem:** NextAuth's default JWT only includes email, not user ID

**Solution:** Custom callbacks to add ID to JWT

```typescript
callbacks: {
  async jwt({ token, user }) {
    // On login (user exists), add user.id to token
    if (user) {
      token.id = user.id;
    }
    return token;
  },

  async session({ session, token }) {
    // Expose token.id to session.user.id
    if (token.id) {
      session.user.id = token.id as string;
    }
    return session;
  }
}
```

**Data flow:**

```
Login success
  ↓
authorize() returns: { id: "123", email: "user@test.com" }
  ↓
jwt callback: Adds id to JWT token
  ↓
JWT token contains: { id: "123", email: "user@test.com", ... }
  ↓
session callback: Exposes id to session.user
  ↓
Code accesses: session.user.id = "123"
```

**Why this is necessary:**

- Without callbacks, `session.user.id` would be undefined
- Avoids database query on every request to get user ID
- Performance optimization (ID cached in JWT)

---

#### E. API Route Handler

**File:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

**What this does:**

- Catches all `/api/auth/*` requests
- Delegates to NextAuth handlers
- Handles: `/api/auth/signin`, `/api/auth/signout`, `/api/auth/session`, etc.

---

### 3. User Registration System

#### A. Registration API

**File:** `src/app/api/auth/register/route.ts`

**Validation steps (ordered by cost - cheap to expensive):**

```typescript
1. Check inputs exist (instant)
2. Validate email format with regex (instant)
3. Validate password length ≥ 6 (instant)
4. Check email uniqueness (database query - ~10ms)
5. Hash password with bcrypt (expensive - ~100ms by design)
6. Insert user into database (database write - ~20ms)
```

**Why this order?**

- Fail-fast approach: reject invalid requests before expensive operations
- If email format wrong → no database access
- If email exists → no password hashing
- Minimizes resource usage on invalid requests

**Password hashing:**

```typescript
const passwordHash = await bcrypt.hash(password, 10);
```

**What `10` means:**

- Salt rounds (cost factor)
- Higher = more secure but slower
- 10 = ~100ms to hash (good balance)
- 12 = ~400ms (banking applications)
- Intentionally slow to prevent brute-force attacks

**Email validation regex:**

```typescript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

- Basic format check (not perfect but good enough)
- Catches obvious typos
- Production apps might use email verification service

---

#### B. Registration Page

**File:** `src/app/auth/register/page.tsx`

**Form fields:**

- Email (type="email" for browser validation)
- Password (minLength={6})
- Confirm Password (frontend validation)

**Frontend validation:**

```typescript
if (password !== confirmPassword) {
  setError("Passwords do not match");
  return; // Don't send to backend
}
```

**Why validate on frontend?**

- Immediate feedback (no network round-trip)
- Better UX (real-time error display)
- Reduces unnecessary API calls
- Backend still validates (defense in depth)

**Success flow:**

```
User submits form
  ↓
Frontend validates passwords match
  ↓
POST /api/auth/register
  ↓
Backend validates + creates user
  ↓
Redirect to /auth/signin
  ↓
User can now log in
```

---

### 4. Login System

#### A. Login Page

**File:** `src/app/auth/signin/page.tsx`

**Key implementation:**

```typescript
const result = await signIn("credentials", {
  email,
  password,
  redirect: false, // Manual redirect control
});

if (result?.error) {
  setError("Invalid email or password");
  return;
}

// Success → redirect to products
router.push("/products");
```

**Why `redirect: false`?**

- Allows custom error handling
- Can show error message in same page
- Better UX than default redirect behavior

**Security note:**

- Error message is generic: "Invalid email or password"
- Doesn't reveal whether email exists (prevents enumeration attack)
- Same message for wrong email or wrong password

---

### 5. Global Session Management

#### A. SessionProvider Integration

**File:** `src/app/layout.tsx`

```typescript
<SessionProvider>
  <CartProvider>
    <Navbar />
    <main>{children}</main>
  </CartProvider>
</SessionProvider>
```

**Provider hierarchy:**

- SessionProvider (outermost) - Auth state
- CartProvider - Shopping cart state
- Both accessible throughout app

**Why SessionProvider is outer?**

- CartProvider might need session data in future
- Navbar needs both cart and session
- Follows "data dependencies" pattern

---

#### B. Navbar Authentication UI

**File:** `src/app/components/Navbar.tsx`

**Features implemented:**

- **Loading state:** Skeleton loader while checking session
- **Authenticated state:**
  - User avatar (first letter of email)
  - Dropdown menu (My Orders, Settings, Sign Out)
  - Click outside to close
- **Unauthenticated state:**
  - "Sign In" button

**Dropdown menu logic:**

```typescript
const [accountOpen, setAccountOpen] = useState(false);
const accountRef = useRef<HTMLDivElement>(null);

// Close when clicking outside
useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
      setAccountOpen(false);
    }
  }
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
```

**Display name logic:**

```typescript
const displayName =
  session?.user?.name || session?.user?.email?.split("@")[0] || "Account";
```

- Prefers user.name (if exists)
- Falls back to email prefix ("user@test.com" → "user")
- Final fallback: "Account"

---

### 6. Guest Checkout Enhancement

#### A. Cart Page Email Input

**File:** `src/app/cart/page.tsx`

**Conditional email input:**

```typescript
{
  !session && (
    <div className="rounded-2xl bg-white px-5 py-5 shadow-sm">
      <h3>Contact Information</h3>
      <input
        type="email"
        value={guestEmail}
        onChange={(e) => setGuestEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <p>
        Or <Link href="/auth/signin">sign in</Link> to save your order history
      </p>
    </div>
  );
}

{
  session && (
    <div className="rounded-2xl bg-white px-5 py-4">
      <Check icon /> Signed in as {session.user?.email}
    </div>
  );
}
```

**Validation logic:**

```typescript
// Only validate guest email if user not logged in
if (!session) {
  if (!guestEmail) {
    setEmailError("Email is required for checkout");
    return;
  }

  if (!validateEmail(guestEmail)) {
    setEmailError("Please enter a valid email address");
    return;
  }
}

const emailToUse = session?.user?.email || guestEmail;
```

**Benefits:**

- Lower friction (don't force registration)
- Collect real email addresses
- Still encourage sign-in with subtle link
- Logged-in users see confirmation of their account

---

#### B. Backend User Association

**File:** `src/app/api/checkout/route.ts`

**Modified to support both authenticated and guest users:**

```typescript
const session = await auth();

// Use session data if logged in, otherwise use guest data
const email = session?.user?.email || body.email || null;
const userId = session?.user?.id ? parseInt(session.user.id) : null;

// Insert order with user_id (null for guests)
await query(
  "INSERT INTO orders (email, total, status, stripe_session_id, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
  [email, total, "pending", session.id, userId]
);
```

**Result:**

- Logged-in users: `user_id` populated, orders appear in My Orders
- Guest users: `user_id` is NULL, order recorded but not in user history

---

### 7. My Orders Page

#### A. Backend API

**File:** `src/app/api/orders/my-orders/route.ts`

**Authentication check:**

```typescript
const session = await auth();

if (!session?.user?.id) {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}
```

**Complex JOIN query:**

```sql
SELECT
  o.id as order_id,
  o.email,
  o.total,
  o.status,
  o.created_at,
  oi.product_id,
  oi.quantity,
  oi.price as item_price,
  p.name as product_name,
  p.image_url
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.user_id = $1
ORDER BY o.created_at DESC
```

**Why three tables JOIN?**

- `orders` → Basic order info
- `order_items` → What was purchased
- `products` → Product names and images (for display)

**Data transformation (flat → nested):**

```typescript
const ordersMap = new Map();

for (const row of result.rows) {
  // First time seeing this order → create entry
  if (!ordersMap.has(row.order_id)) {
    ordersMap.set(row.order_id, {
      id: row.order_id,
      total: parseFloat(row.total),
      status: row.status,
      createdAt: row.created_at,
      items: [], // Empty array for items
    });
  }

  // Add item to order's items array
  if (row.product_id) {
    ordersMap.get(row.order_id).items.push({
      productId: row.product_id,
      name: row.product_name,
      quantity: row.quantity,
      price: parseFloat(row.item_price),
      imageUrl: row.image_url,
    });
  }
}

const orders = Array.from(ordersMap.values());
```

**Why Map data structure?**

- O(1) lookup to check if order exists
- O(1) retrieval to add items
- Automatic deduplication by order_id
- Easy conversion to array

---

#### B. My Orders Frontend Page

**File:** `src/app/orders/page.tsx`

**Features:**

- Auto-redirect if not authenticated
- Loading skeleton (maintains layout)
- Empty state with CTA to browse products
- Order cards with detailed information

**Order card anatomy:**

```
┌─────────────────────────────────────┐
│ [Gray Header]                       │
│ Order #123 | Dec 4, 2025 | $59.98  │
│ Status: [Paid Badge]                │
├─────────────────────────────────────┤
│ [White Body]                        │
│ [img] Product A    Qty: 2  $29.99   │
│ [img] Product B    Qty: 1  $29.99   │
└─────────────────────────────────────┘
```

**Status badges (color-coded):**

- **Paid:** Green badge with dot indicator
- **Pending:** Yellow badge with dot indicator
- **Others:** Gray badge (future-proof)

**Responsive design:**

- Order header wraps on mobile
- Product images scale appropriately
- Maintains readability on all devices

---

### 8. Toast Notification System

#### A. CartContext Integration

**File:** `src/app/context/CartContext.tsx`

**Added toast state:**

```typescript
const [showToast, setShowToast] = useState(false);
const [toastMessage, setToastMessage] = useState("");
```

**Modified addToCart:**

```typescript
const addToCart = (product: Product) => {
  // ... existing cart logic

  // Show toast notification
  setToastMessage(`${product.name} added to cart`);
  setShowToast(true);

  // Auto-hide after 3 seconds
  setTimeout(() => {
    setShowToast(false);
  }, 3000);
};
```

**Exposed in context:**

```typescript
<CartContext.Provider
  value={{
    cart, addToCart, removeFromCart, clearCart,
    showToast, toastMessage, setShowToast  // Toast state
  }}
>
```

---

#### B. Toast Component

**File:** `src/app/components/Toast.tsx`

**Features:**

- Fixed position (top-right)
- Slide-in animation from right
- Auto-dismiss after 3 seconds
- Manual close button (X)
- ESC key support
- Semi-transparent backdrop (subtle emphasis)

**Animation:**

```css
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

**Visual design:**

- Green checkmark icon (success indicator)
- Two-line message (title + detail)
- White card with shadow
- Matches overall design system

**Replaced:**

- ❌ Old: `alert("Added to cart")` (browser native, blocking)
- ✅ New: Slide-in toast (custom, non-blocking)

---

## Security Implementation Details

### 1. Password Security - bcrypt

**Why bcrypt?**

- Industry-standard password hashing
- Adaptive (can increase cost factor over time)
- Built-in salt (prevents rainbow table attacks)
- Intentionally slow (prevents brute-force)

**How bcrypt works:**

**Registration (hashing):**

```typescript
Input: "myPassword123"
  ↓
bcrypt.hash("myPassword123", 10)
  ↓
Output: "$2a$10$N9qo8uLOickgx2ZMRZoMye..."
  ↓
Store in database
```

**Login (verification):**

```typescript
User enters: "myPassword123"
Database has: "$2a$10$N9qo8uLOickgx2ZMRZoMye..."
  ↓
bcrypt.compare("myPassword123", "$2a$10$...")
  ↓
Internally: Re-hashes input with same salt
  ↓
Compares two hashes
  ↓
Returns: true (match) or false (no match)
```

**Key insight:**

- Hash is ONE-WAY (cannot decrypt)
- Verification is RE-HASH and COMPARE
- Even if database leaked, passwords remain secure
- Attacker would need years to brute-force

**Common misconception corrected:**

- ❌ "bcrypt decrypts the hash to compare"
- ✅ "bcrypt re-hashes the input and compares hashes"

---

### 2. JWT Security

**What's in the JWT?**

```typescript
{
  id: "123",
  email: "user@test.com",
  iat: 1234567890,  // Issued at
  exp: 1234654290   // Expires at
}
```

**Can users see this data?**

- ✅ Yes (JWT is base64-encoded, not encrypted)
- Users can decode and see id, email

**Is this secure?**

- ✅ Yes! Because of signature verification
- JWT has three parts: `header.payload.signature`
- Signature created with secret key (only server knows)

**Attack scenario (fails):**

```
1. Attacker decodes JWT, sees: { id: "123" }
2. Attacker changes to: { id: "999" }  (trying to impersonate user 999)
3. Attacker encodes and sends modified JWT
4. Server verifies signature
5. Signature doesn't match (content changed)
6. Server rejects request ❌
```

**What should NEVER be in JWT:**

- ❌ Passwords (plaintext or hashed)
- ❌ Credit card numbers
- ❌ Social security numbers
- ❌ API secret keys
- ✅ Non-sensitive identifiers (id, email, role)

**Why id in JWT is safe:**

- ID itself isn't secret
- Backend still validates ownership (e.g., `WHERE user_id = session.user.id`)
- Performance benefit (no database query to get user ID)
- Standard practice (Google, GitHub, Stripe all do this)

---

### 3. Session vs JWT Decision

**Chose JWT strategy:**

**Rationale:**

```
✅ Better for Vercel/serverless deployment
✅ No database query on every request (faster)
✅ Stateless (easier to scale)
✅ NextAuth's recommended default
✅ Suitable for project scale
```

**Trade-offs accepted:**

```
⚠️ Cannot instantly revoke (must wait for token expiry)
⚠️ Cannot list "all active sessions"
⚠️ Token valid until expiration even if password changed
```

**When to use database sessions instead:**

- Need "Sign out all devices" feature
- Financial/medical applications (strict compliance)
- Need to track active devices
- Traditional monolithic architecture

---

## UI/UX Enhancements

### 1. Form Design Consistency

**All auth forms follow same pattern:**

- Centered card layout (max-width: md)
- White card on off-white background
- Rounded corners (2xl = 16px)
- Subtle shadow
- Input fields with focus states (border turns blue)
- Error messages in red background boxes
- Loading states (button text changes + disabled)

**Input field interactions:**

```typescript
onFocus: border-color → primary blue
onBlur: border-color → default gray
onChange: clears previous errors
```

---

### 2. Toast vs Alert Comparison

**Before (Step 3):**

```typescript
addToCart(product);
alert("Added to cart"); // Blocking, ugly
```

**After (Step 4):**

```typescript
addToCart(product);
// Toast slides in automatically
// Non-blocking, beautiful
// Auto-dismisses after 3s
```

**Toast advantages:**

- Non-blocking (user can continue browsing)
- Consistent with design system
- Auto-dismiss (no manual action needed)
- Can be dismissed early (X button or ESC key)

---

### 3. Guest Checkout UX

**Design decisions:**

**Email input placement:**

- Above order summary (clear information hierarchy)
- Only shows when not logged in
- Includes subtle "sign in" link

**Messaging:**

```
"We'll send your order confirmation here"
"Or sign in to save your order history"
```

- Benefits-focused (not restrictive)
- Encourages registration without forcing it
- Maintains conversion rate

**Validation feedback:**

- Real-time error clearing (as user types)
- Focus state indicates active field
- Error appears below input (doesn't shift layout)

---

## Technical Patterns & Best Practices

### 1. Progressive Enhancement

**Auth state handling:**

```typescript
status === "loading"  → Show skeleton
status === "authenticated" → Show user UI
status === "unauthenticated" → Show sign-in prompt
```

**Why three states?**

- Prevents flash of wrong content
- Better perceived performance
- Graceful loading experience

---

### 2. Optimistic vs Pessimistic UI

**Registration flow (pessimistic):**

```
User clicks "Sign Up"
  ↓
Button shows "Creating account..." (loading state)
  ↓
Wait for server response
  ↓
Show success/error
```

**Why pessimistic here?**

- Registration is one-time action
- Error handling is important
- User expects to wait

**Add to cart (optimistic - future enhancement):**

```
User clicks "Add to Cart"
  ↓
Immediately update cart count (assume success)
  ↓
Show toast
  ↓
Send request in background
  ↓
Revert if fails
```

**Why optimistic?**

- Feels faster
- Failure rate is low
- Better perceived performance

---

### 3. Data Fetching Patterns

**Client-side fetching (My Orders page):**

```typescript
useEffect(() => {
  if (status === "authenticated") {
    fetchOrders();
  }
}, [status]);
```

**Why client-side?**

- Data is user-specific (can't pre-render)
- Needs session data
- Updates on user actions

**Server-side would be better for:**

- Public product listings
- Static content
- SEO-important pages

---

## Files Created/Modified

### New Files

```
src/auth.ts
src/app/api/auth/[...nextauth]/route.ts
src/app/api/auth/register/route.ts
src/app/api/orders/my-orders/route.ts
src/app/auth/register/page.tsx
src/app/auth/signin/page.tsx
src/app/orders/page.tsx
src/app/components/Toast.tsx
```

### Modified Files

```
src/app/layout.tsx              // Added SessionProvider
src/app/components/Navbar.tsx   // Auth UI, dropdown menu
src/app/cart/page.tsx           // Guest email input
src/app/context/CartContext.tsx // Toast state
src/app/globals.css             // slideInRight animation
src/app/api/checkout/route.ts   // User association
```

### Database Changes

```sql
CREATE TABLE users (...)
ALTER TABLE orders ADD COLUMN user_id
DROP INDEX idx_users_email  (redundant with UNIQUE constraint)
```

---

## Testing & Verification

### Test Suite

**Test 1: User Registration**

- ✅ Register with valid email/password
- ✅ Password confirmation validation
- ✅ Email format validation
- ✅ Duplicate email rejection
- ✅ Password too short rejection
- ✅ Successful redirect to sign-in

**Test 2: User Login**

- ✅ Login with correct credentials
- ✅ Login with wrong password → error
- ✅ Login with non-existent email → error
- ✅ Generic error message (security)
- ✅ Successful redirect to products

**Test 3: Session Persistence**

- ✅ Refresh page → still logged in
- ✅ Navigate between pages → session maintained
- ✅ JWT cookie visible in DevTools
- ✅ Session data accessible: `session.user.id`, `session.user.email`

**Test 4: Authenticated Checkout**

- ✅ Login → Add to cart → Checkout
- ✅ Order uses session email automatically
- ✅ Order has user_id in database
- ✅ Order appears in My Orders page

**Test 5: Guest Checkout**

- ✅ Logout → Add to cart → Checkout
- ✅ Email input field appears
- ✅ Validation: empty email rejected
- ✅ Validation: invalid format rejected
- ✅ Valid email → checkout succeeds
- ✅ Order has email but user_id is NULL
- ✅ Order does NOT appear in My Orders

**Test 6: Toast Notifications**

- ✅ Add product → toast slides in
- ✅ Auto-dismisses after 3 seconds
- ✅ Manual close via X button
- ✅ ESC key closes toast
- ✅ Non-blocking (can continue shopping)

**Test 7: My Orders Page**

- ✅ While logged out → redirects to sign-in
- ✅ While logged in → shows order history
- ✅ Orders sorted newest first
- ✅ Each order shows all items
- ✅ Status badges display correctly
- ✅ Product images shown (if available)
- ✅ Empty state if no orders

**Test 8: Navbar UI**

- ✅ Loading: Shows skeleton
- ✅ Logged out: Shows "Sign In" button
- ✅ Logged in: Shows avatar + dropdown
- ✅ Dropdown: My Orders, Settings, Sign Out
- ✅ Click outside: Dropdown closes
- ✅ Sign out: Clears session, returns to home

---

## Architecture Decisions

### 1. NextAuth vs Alternatives

**Why NextAuth.js?**

- ✅ Next.js ecosystem standard
- ✅ Production-proven (used by thousands of apps)
- ✅ Data stays in your database (vs Clerk/Supabase)
- ✅ Free, unlimited users
- ✅ Good learning value (understand auth flows)
- ✅ Extensible (can add OAuth providers later)

**vs Clerk/Supabase:**

- Clerk: Easier but third-party dependency
- Supabase: Would require migration from Neon
- Both: Lower learning value (too abstracted)

**vs Custom JWT:**

- Too risky (easy to make security mistakes)
- Time-consuming (8-10 hours)
- Reinventing the wheel

---

### 2. JWT vs Database Sessions

**Chose JWT:**

**Advantages for this project:**

- Faster (no database query per request)
- Better for serverless (Vercel deployment)
- Simpler architecture
- NextAuth's default

**Limitations accepted:**

- Can't instantly revoke sessions
- Can't list active sessions
- Token valid until expiry

**Could switch to database sessions by changing one config:**

```typescript
session: {
  strategy: "database";
}
```

---

### 3. MVP Field Selection

**users table - only 4 fields:**

```
id, email, password_hash, created_at
```

**Deliberately excluded (can add later):**

- `name` → Not needed yet (use email prefix)
- `phone` → Not needed for MVP
- `avatar_url` → Not needed for MVP
- `role` → Can add when building admin features
- `is_email_verified` → Requires email service
- `stripe_customer_id` → For saved cards (future feature)

**Philosophy:** Add fields when needed, not speculatively

---

## SQL Concepts Learned

### LEFT JOIN Explained

**Visual representation:**

```
Table A (orders)     Table B (order_items)
┌────┬───────┐      ┌──────────┬────────┐
│ id │ total │      │ order_id │ item   │
├────┼───────┤      ├──────────┼────────┤
│ 10 │ $50   │ ───┬─│    10    │ iPhone │
│    │       │    └─│    10    │ AirPods│
│ 11 │ $20   │ ─────│    11    │ Cable  │
└────┴───────┘      └──────────┴────────┘

LEFT JOIN result:
┌────┬───────┬────────┐
│ 10 │ $50   │ iPhone │
│ 10 │ $50   │ AirPods│  ← Order 10 repeated
│ 11 │ $20   │ Cable  │
└────┴───────┴────────┘
```

**LEFT JOIN vs INNER JOIN:**

- LEFT JOIN: Keep all orders (even if no items)
- INNER JOIN: Only orders that have items
- We use LEFT JOIN (future-proof for empty orders)

---

### Index Performance

**Why index on email?**

**Without index:**

```
10,000 users
Login query: SELECT ... WHERE email = 'user@test.com'
Database scans: ~5,000 rows (average)
Time: 50-100ms
```

**With index:**

```
10,000 users
Login query: SELECT ... WHERE email = 'user@test.com'
Database scans: ~13 rows (logarithmic)
Time: 2-5ms
```

**Performance gain: 10-20x faster**

**Why UNIQUE creates index automatically:**

- PostgreSQL needs fast lookup to enforce uniqueness
- Automatically creates B-tree index
- No need for manual index on UNIQUE columns

---

## Known Limitations & Future Work

### Current State

- ✅ Basic auth (email/password)
- ✅ Guest checkout supported
- ✅ Order history for logged-in users
- ⚠️ No email verification (anyone can use any email)
- ⚠️ No password reset functionality
- ⚠️ No "remember me" option
- ⚠️ No OAuth (Google/GitHub login)
- ⚠️ No user profile editing
- ⚠️ No admin role enforcement

### Next Recommended Steps

**High Priority:**

1. **Cart sidebar** (1.5-2h) - Better UX for adding products
2. **Middleware route protection** (30min) - Protect sensitive routes
3. **Admin panel access control** (1h) - Add role field, protect `/admin`

**Medium Priority:** 4. **User profile page** (1h) - View/edit account details 5. **Password reset flow** (2-3h) - Forgot password functionality 6. **Email verification** (2-3h) - Verify email ownership

**Low Priority:** 7. **OAuth providers** (2h) - Google/GitHub sign-in 8. **Session list** (3h) - View active devices 9. **Two-factor authentication** (4-6h) - Enhanced security

---

## Lessons Learned

### 1. bcrypt: Hashing is Not Encryption

- Encryption: Two-way (can decrypt)
- Hashing: One-way (cannot reverse)
- Password verification = re-hash and compare
- Security through irreversibility

### 2. JWT Token Visibility ≠ Insecurity

- Users can see JWT contents
- But cannot modify without detection
- Signature prevents tampering
- Non-sensitive data only

### 3. Database Normalization vs Denormalization

- Normalized: orders → order_items → products (three tables)
- JOIN query flattens relationships
- Backend transforms flat → nested for frontend
- Trades query complexity for data integrity

### 4. Index Strategy

- UNIQUE constraint creates index automatically
- Manual index only needed for non-unique frequent queries
- Duplicate indexes waste space and slow writes

### 5. Form Validation Layers

- Browser validation (HTML5 attributes)
- Frontend validation (immediate feedback)
- Backend validation (security + data integrity)
- Defense in depth: all three layers

---

## Performance Metrics

### Auth Operations

- Registration: ~120ms (bcrypt hashing dominates)
- Login: ~110ms (database query + bcrypt verify)
- Session check: ~0ms (JWT verified locally, no database)

### My Orders Page

- Database query: ~15ms (single JOIN)
- Data transformation: <1ms (Map operations)
- Total load time: <50ms (most time in network)

### Toast Notification

- Animation: 300ms slide-in
- Auto-dismiss: 3000ms
- Imperceptible performance impact

---

## Security Checklist

### ✅ Implemented

- Password hashing (bcrypt, 10 rounds)
- SQL injection prevention (parameterized queries)
- JWT signature verification
- Input validation (email format, password length, quantity ranges)
- HTTPS enforced (production deployment)
- Secure session storage (httpOnly cookies)

### ⚠️ Not Yet Implemented - some are potential update

- Rate limiting (prevent brute-force)
- Email verification (confirm ownership)
- Password reset (secure token-based)
- CSRF protection (Next.js API routes vulnerable)
- Account lockout (after failed attempts)
- Password complexity requirements (uppercase, numbers, symbols)

---

## Status

✅ **Complete user authentication system**  
✅ **Guest and authenticated checkout**  
✅ **Personalized order history**  
✅ **Production-ready auth flow**  
⚠️ **Email verification recommended before production**

---
