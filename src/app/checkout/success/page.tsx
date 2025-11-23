//page for successful checkout
"use client";

import { useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <main style={{ padding: "20px" }}>
      <h1>Payment Success</h1>
      <p>Thank you for your purchase!</p>
      {sessionId && <p>Your session id: {sessionId}</p>}
      <p>You can now safely close this page.</p>
    </main>
  );
}
