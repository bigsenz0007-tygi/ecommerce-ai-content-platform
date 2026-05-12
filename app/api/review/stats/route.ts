import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSeedData } from "@/lib/pipeline";
import { getDemoReviewStats } from "@/lib/demo-runtime";

export async function GET() {
  try {
    await ensureSeedData();

    const [pendingReview, adopted, aiAdopted, aiRecommendedTotal, settings] = await Promise.all([
      prisma.task.count({ where: { status: "review_ready" } }),
      prisma.task.count({ where: { adopted: true } }),
      prisma.task.count({ where: { adopted: true, scoreTotal: { gte: 80 } } }),
      prisma.task.count({ where: { scoreTotal: { gte: 80 } } }),
      prisma.appSettings.findUniqueOrThrow({ where: { id: "singleton" } }),
    ]);

    const reviewed = adopted + settings.rejectedCount;
    const adoptionRate = reviewed === 0 ? 0 : Number(((adopted / reviewed) * 100).toFixed(1));
    const aiRecommendAdoptionRate =
      aiRecommendedTotal === 0
        ? 0
        : Number(((aiAdopted / aiRecommendedTotal) * 100).toFixed(1));

    return NextResponse.json({
      reviewed,
      pendingReview,
      rejected: settings.rejectedCount,
      adoptionRate,
      aiRecommendAdoptionRate,
      aiAdoptedCount: aiAdopted,
    });
  } catch {
    return NextResponse.json(getDemoReviewStats());
  }
}
