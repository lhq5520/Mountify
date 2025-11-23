This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Step 1A:

Goal: use fake data(API) to fetch data! In another words, use api as database to return data!

✅ You’ve made it happen:

/api/products → returns JSON

/products → fetches data from the API and renders it

That means your frontend and backend just connected for the first time — browser → API → data response.

## Step 1B:

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

## Step 1C:

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

## Step 2A:

🧭 Stage Goal

So far, your /api/products endpoint has only been returning a dummy array.
Next, we want this API to start pulling real data from the database.

| Part                   | Status                                                                            |
| ---------------------- | --------------------------------------------------------------------------------- |
| Backend API            | ✔ Updated to read from the database                                               |
| Database Connection    | ✔ Configured with Pool + environment variables                                    |
| Frontend Page          | ✔ Reused as-is, no structural changes needed                                      |
| Technical Breakthrough | ✅ You successfully rendered dynamic data from a real database for the first time |

## Step 2B:

In 2A the setup is:

/api/products → fetch all products from the database ✅

/products → product list page ✅

/product/[id] → the detail page is still doing fetch("/api/products") and then find ❌ (kind of crude)

We want to change it to:

/api/products/[id] → handles a single product

/product/[id] → directly requests /api/products/:id

Now this part has finished:

Database → API (list + single) → Frontend pages (list + detail).

## Step 2C:

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

## Step 2D:

Stripe Checkout Integration (Learning Version)
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
