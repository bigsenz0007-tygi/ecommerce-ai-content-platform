import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSeedData } from "@/lib/pipeline";

export async function GET() {
  await ensureSeedData();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [total, todayCount, pendingReview, adopted, rejected, published, accounts, categories, pendingTask, pendingPublish] =
    await Promise.all([
      prisma.task.count(),
      prisma.task.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.task.count({ where: { status: "review_ready", adopted: false } }),
      prisma.task.count({ where: { adopted: true } }),
      prisma.task.count({ where: { status: "rejected" } }),
      prisma.task.count({ where: { status: "published" } }),
      prisma.account.count(),
      prisma.category.count(),
      prisma.task.count({ where: { status: "pending_task" } }),
      prisma.task.count({
        where: {
          OR: [{ status: "pending_publish" }, { status: "completed" }],
        },
      }),
    ]);

  const settings = await prisma.appSettings.findUniqueOrThrow({ where: { id: "singleton" } });

  const adoptionRate = total === 0 ? 0 : Number(((adopted / total) * 100).toFixed(1));
  const rejectionRate = total === 0 ? 0 : Number(((rejected / total) * 100).toFixed(1));

  return NextResponse.json({
    totalTasks: total,
    todayGenerated: todayCount,
    pendingReview,
    pendingTask,
    pendingPublish,
    adopted,
    rejected,
    published,
    adoptionRate,
    rejectionRate,
    accounts,
    categories,
    dailyTarget: settings.dailyCount,
    premiumSlots: settings.premiumSlots,
    scheduleHour: settings.scheduleHour,
  });
}
