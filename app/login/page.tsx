"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const canSend = useMemo(() => /^1\d{10}$/.test(phone), [phone]);
  const canLogin = useMemo(() => canSend && /^\d{6}$/.test(code), [canSend, code]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendCode() {
    if (!canSend) {
      setHint("请输入正确的11位手机号");
      return;
    }
    if (cooldown > 0) return;
    setSending(true);
    try {
      const r = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = (await r.json()) as { error?: string; debugCode?: string; message?: string };
      if (!r.ok) {
        setHint(j.error || "验证码发送失败");
        return;
      }
      setCooldown(60);
      if (j.debugCode) {
        setHint(`验证码已发送，演示验证码：${j.debugCode}`);
      } else {
        setHint(j.message || "验证码已发送，请注意查收");
      }
    } finally {
      setSending(false);
    }
  }

  async function login() {
    if (!canLogin) {
      setHint("请输入手机号和6位验证码");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setHint(j.error || "登录失败");
        return;
      }
      router.replace(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[440px] items-center px-4 py-10">
      <div className="glass w-full rounded-2xl p-6">
        <div className="text-xl font-semibold">手机号验证码登录</div>
        <div className="mt-1 text-xs text-[hsl(var(--muted))]">
          未登录仅支持体验：随便生最多3条图文，其他操作需登录。
        </div>
        <div className="mt-4 space-y-3">
          <input
            className="biz-control w-full"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <input
              className="biz-control w-full"
              placeholder="请输入验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              onClick={() => void sendCode()}
              className="btn-secondary rounded-xl"
              disabled={sending || cooldown > 0}
            >
              {sending ? "发送中" : cooldown > 0 ? `${cooldown}s` : "获取验证码"}
            </button>
          </div>
          <button onClick={() => void login()} className="biz-primary-btn w-full" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
          {hint ? <div className="text-xs text-[hsl(var(--muted))]">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}
