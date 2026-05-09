"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function StatCard({
  label,
  value,
  hint,
  actionHref,
  actionLabel,
}: {
  label: string;
  value: string | number;
  hint?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const targetNumber = useMemo(() => (typeof value === "number" ? value : Number.NaN), [value]);
  const [displayValue, setDisplayValue] = useState<number | string>(
    Number.isFinite(targetNumber) ? 0 : value
  );

  useEffect(() => {
    if (!Number.isFinite(targetNumber)) {
      setDisplayValue(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 700;
    const from = 0;
    const to = targetNumber;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (to - from) * eased);
      setDisplayValue(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetNumber, value]);

  return (
    <div className="glass ring-glow rounded-2xl p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted))]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{displayValue}</div>
      {hint ? <div className="mt-2 text-xs text-[hsl(var(--muted))]">{hint}</div> : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-3 inline-block rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--surface-raised)/0.6)]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
