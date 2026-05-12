"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Option = { label: string; value: string };

export function BizDropdown({
  value,
  options,
  onChange,
  placeholder = "请选择",
  className = "",
}: {
  value: string;
  options: Option[];
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((x) => x.value === value) ?? null, [options, value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${open ? "z-[80]" : ""} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="biz-control flex w-full items-center justify-between text-left"
      >
        <span className={selected ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground)/0.5)]"}>
          {selected?.label ?? placeholder}
        </span>
        <span className={`ml-2 inline-flex transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M1.5 1.6L6 6.3L10.5 1.6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[81] w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] p-1 shadow-lg">
          {options.length > 0 ? (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-2 py-2 text-left fs-14 ${
                  value === opt.value
                    ? "bg-[hsl(var(--accent)/0.18)] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface)/0.9)]"
                }`}
              >
                {value === opt.value ? `✓ ${opt.label}` : opt.label}
              </button>
            ))
          ) : (
            <div className="px-2 py-2 fs-13 text-[hsl(var(--foreground)/0.55)]">暂无可选内容</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
