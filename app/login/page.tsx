import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[hsl(var(--muted))]">
          加载中…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
