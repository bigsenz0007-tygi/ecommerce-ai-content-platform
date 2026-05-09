import { Suspense } from "react";
import { ContentPageClient } from "./content-client";

export default function ContentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-[hsl(var(--muted))]">加载中…</div>
      }
    >
      <ContentPageClient />
    </Suspense>
  );
}
