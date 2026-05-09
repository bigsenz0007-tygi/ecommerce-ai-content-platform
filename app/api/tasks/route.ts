import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const adopted = searchParams.get("adopted");
  const objective = searchParams.get("objective");
  const contentFormat = searchParams.get("contentFormat");
  const qualityLabel = searchParams.get("qualityLabel");
  const platform = searchParams.get("platform");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const minScore = searchParams.get("minScore");
  const maxScore = searchParams.get("maxScore");
  const efficiency = searchParams.get("efficiency");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (adopted === "true") where.adopted = true;
  if (adopted === "false") where.adopted = false;
  if (objective) where.objective = objective;
  if (contentFormat) where.contentFormat = contentFormat;
  if (qualityLabel) where.qualityLabel = qualityLabel;
  if (platform) where.account = { platform };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }
  if (minScore || maxScore) {
    where.scoreTotal = {
      ...(minScore ? { gte: Number(minScore) } : {}),
      ...(maxScore ? { lte: Number(maxScore) } : {}),
    };
  }

  let tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { account: true, category: true },
    take: 200,
  });

  if (efficiency === "采纳") tasks = tasks.filter((t) => t.adopted);
  if (efficiency === "驳回") tasks = tasks.filter((t) => t.status === "rejected");
  if (efficiency === "处理中")
    tasks = tasks.filter((t) => !t.adopted && t.status !== "rejected");

  return NextResponse.json({ tasks });
}
