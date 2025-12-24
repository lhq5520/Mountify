// src/app/checkout/success/page.tsx
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CheckoutSuccessClient from "./CheckoutSuccessClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <CheckoutSuccessClient />
    </Suspense>
  );
}
