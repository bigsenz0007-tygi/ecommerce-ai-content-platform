import { NextResponse } from "next/server";
import { createSmsChallenge } from "@/lib/auth-store";

function isValidPhone(phone: string) {
  return /^1\d{10}$/.test(phone);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { phone?: string };
  const phone = (body.phone || "").trim();
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "请输入正确的11位手机号" }, { status: 400 });
  }

  const r = await createSmsChallenge(phone);
  if ("error" in r) {
    const status = r.status ?? 400;
    return NextResponse.json({ error: r.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    message:
      process.env.NODE_ENV === "production"
        ? "验证码已发送，请通过短信服务商通道查收"
        : "验证码已发送（演示）",
    debugCode:
      process.env.NODE_ENV === "production" ? undefined : r.code,
  });
}
