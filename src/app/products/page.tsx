export const dynamic = "force-dynamic"; // 推荐：产品筛选依赖 query，别静态预渲染

import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ProductsClient />
    </Suspense>
  );
}
