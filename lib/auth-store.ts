import { randomInt, randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export type UserRecord = {
  id: string;
  phone: string;
  createdAt: string;
};

export type LoginSuccess = {
  user: UserRecord;
  token: string;
  expiresAt: Date;
};

export type LoginFailure = { error: string };

/** 发送验证码：成功返回 code；失败返回 error */
export async function createSmsChallenge(
  phone: string
): Promise<{ code: string } | { error: string; status?: number }> {
  const now = Date.now();
  const recent = await prisma.authSmsCode.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
  if (recent && now - recent.createdAt.getTime() < 60 * 1000) {
    return { error: "验证码发送过于频繁，请稍后再试", status: 429 };
  }

  const code = `${randomInt(100000, 1000000)}`;
  await prisma.authSmsCode.create({
    data: {
      phone,
      code,
      expiresAt: new Date(now + 5 * 60 * 1000),
    },
  });

  await prisma.authSmsCode.deleteMany({
    where: { createdAt: { lt: new Date(now - 7 * 24 * 60 * 60 * 1000) } },
  });

  return { code };
}

const SMS_INVALID = "SMS_INVALID";

export async function loginWithSms(
  phone: string,
  code: string
): Promise<LoginSuccess | LoginFailure> {
  const now = new Date();
  try {
    const out = await prisma.$transaction(async (tx) => {
      const sms = await tx.authSmsCode.findFirst({
        where: { phone, code, used: false, expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" },
      });
      if (!sms) throw new Error(SMS_INVALID);

      await tx.authSmsCode.update({
        where: { id: sms.id },
        data: { used: true },
      });

      let user = await tx.authUser.findUnique({ where: { phone } });
      if (!user) {
        user = await tx.authUser.create({ data: { phone } });
      }

      const token =
        randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await tx.authSession.deleteMany({ where: { userId: user.id } });
      await tx.authSession.create({
        data: { token, userId: user.id, expiresAt },
      });

      return {
        user: {
          id: user.id,
          phone: user.phone,
          createdAt: user.createdAt.toISOString(),
        },
        token,
        expiresAt,
      };
    });
    return out;
  } catch (e) {
    if (e instanceof Error && e.message === SMS_INVALID) {
      return { error: "验证码错误或已过期" };
    }
    return { error: "登录失败，请稍后重试" };
  }
}

export async function getUserBySessionToken(
  token: string
): Promise<UserRecord | null> {
  const s = await prisma.authSession.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!s || s.expiresAt.getTime() <= Date.now()) return null;
  const u = s.user;
  return { id: u.id, phone: u.phone, createdAt: u.createdAt.toISOString() };
}

export async function revokeSessionToken(token: string) {
  await prisma.authSession.deleteMany({ where: { token } });
}
