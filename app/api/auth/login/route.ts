import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, maskPhone } from "@/lib/auth-session";
import { loginWithSms } from "@/lib/auth-store";

function isValidPhone(phone: string) {
  return /^1\d{10}$/.test(phone);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { phone?: string; code?: string };
  const phone = (body.phone || "").trim();
  const code = (body.code || "").trim();
  if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "手机号或验证码格式错误" }, { status: 400 });
  }

  const r = await loginWithSms(phone, code);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: 400 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      id: r.user.id,
      phone: r.user.phone,
      phoneMasked: maskPhone(r.user.phone),
    },
  });
  response.cookies.set(AUTH_COOKIE_NAME, r.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: r.expiresAt,
  });
  return response;
}
