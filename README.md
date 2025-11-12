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

✅ You’ve made it happen:

/api/products → returns JSON

/products → fetches data from the API and renders it

That means your frontend and backend just connected for the first time — browser → API → data response.

## Step 1B:

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

✅ Test this out!

Open /product/1 → Click “Add to Cart”

Open /cart → Check whether the item you just added appears

Add it a few more times → See if the quantity increases

Click “Remove” → Check if the item can be deleted

🧭 After completing this, you’ll have learned:

Concept Practical Meaning
Context / Provider A way to share state across multiple pages
Custom Hook (useCart) A good habit for encapsulating reusable logic
State update logic (setCart(prev => ...)) The core of React’s “immutable updates” concept
