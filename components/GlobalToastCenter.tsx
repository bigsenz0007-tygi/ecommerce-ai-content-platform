"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ToastPayload = {
  id: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export function GlobalToastCenter() {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const pickNotice = () => {
      const raw = localStorage.getItem("tygi_global_toast");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as ToastPayload;
        setToast(parsed);
        localStorage.removeItem("tygi_global_toast");
      } catch {
        localStorage.removeItem("tygi_global_toast");
      }
    };
    pickNotice();
    const onToast = (ev: Event) => {
      const detail = (ev as CustomEvent<ToastPayload>).detail;
      if (detail?.message) setToast(detail);
    };
    window.addEventListener("tygi:toast", onToast as EventListener);
    const timer = window.setInterval(pickNotice, 1500);
    return () => {
      window.removeEventListener("tygi:toast", onToast as EventListener);
      window.clearInterval(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] w-[min(92vw,420px)] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] p-3 shadow-2xl">
      <div className="fs-14">{toast.message}</div>
      <div className="mt-2 flex gap-2">
        {toast.actionHref && toast.actionLabel ? (
          <Link href={toast.actionHref} className="rounded-lg border border-[hsl(var(--accent)/0.65)] px-3 py-1.5 fs-12 hover:bg-[hsl(var(--accent)/0.16)]">
            {toast.actionLabel}
          </Link>
        ) : null}
        <button type="button" onClick={() => setToast(null)} className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 fs-12">
          知道了
        </button>
      </div>
    </div>
  );
}
