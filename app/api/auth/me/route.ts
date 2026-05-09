import { NextResponse } from "next/server";
import { getCurrentUserFromCookie, maskPhone } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUserFromCookie();
  if (!user) return NextResponse.json({ loggedIn: false });
  return NextResponse.json({
    loggedIn: true,
    user: {
      id: user.id,
      phone: user.phone,
      phoneMasked: maskPhone(user.phone),
    },
  });
}
