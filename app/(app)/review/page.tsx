import { Suspense } from "react";
import { ReviewPageClient } from "./review-client";

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-[hsl(var(--muted))]">加载中…</div>
      }
    >
      <ReviewPageClient />
    </Suspense>
  );
}
