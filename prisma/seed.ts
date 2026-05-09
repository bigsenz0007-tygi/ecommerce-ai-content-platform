import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      dailyCount: 10,
      premiumSlots: 2,
      scheduleHour: 9,
      bannedWords: JSON.stringify(["最", "第一", "国家级"]),
    },
    update: {},
  });

  const a = await prisma.account.count();
  if (a === 0) {
    await prisma.account.createMany({
      data: [
        { name: "旗舰店-A", platform: "淘宝", tone: "克制专业、少感叹号" },
        { name: "内容号-B", platform: "抖音", tone: "短句、强节奏、口语化" },
      ],
    });
  }

  const c = await prisma.category.count();
  if (c === 0) {
    await prisma.category.createMany({
      data: [
        { name: "美妆护肤", keywords: "保湿 修护 通勤" },
        { name: "家居收纳", keywords: "收纳 省空间 耐用" },
      ],
    });
  }

  console.log("Seed OK");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
