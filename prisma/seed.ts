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
        { name: "生活日常", keywords: "日常 记录 生活感 vlog" },
        { name: "美妆穿搭", keywords: "妆容 护肤 穿搭 ootd" },
        { name: "美食探店", keywords: "探店 美食 打卡 口味" },
        { name: "知识干货", keywords: "教程 清单 方法论 复盘" },
        { name: "情感文案", keywords: "共鸣 情绪 关系 治愈" },
        { name: "好物种草", keywords: "种草 测评 性价比 真实体验" },
        { name: "娱乐剧情", keywords: "剧情 反转 段子 娱乐" },
        { name: "职场创业", keywords: "职场 效率 创业 成长" },
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
