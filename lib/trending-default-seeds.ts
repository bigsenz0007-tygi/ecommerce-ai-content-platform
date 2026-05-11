/** 首次空库时写入推荐库；赛道名与 Category / 随便生 一致 */

export const DEFAULT_TRENDING_PICKS: Array<{
  platform: string;
  category: string;
  title: string;
  contentBody: string;
  tagsJson: string;
  likes: number;
  comments: number;
  favorites: number;
  url: string;
}> = [
  {
    platform: "抖音",
    category: "职场创业",
    title: "面试反问 HR 的 5 个高分问题",
    contentBody: "面试官视角口播，正反例对比，适合求职季流量。结尾引导收藏备用。",
    tagsJson: JSON.stringify(["#面试技巧", "#求职", "#反问HR", "#职场干货", "#春招"]),
    likes: 18200,
    comments: 920,
    favorites: 24100,
    url: "https://www.douyin.com/video/7300000000000000010",
  },
  {
    platform: "抖音",
    category: "美食探店",
    title: "商场负一层隐藏款小吃测评",
    contentBody: "第一口反应剪辑，价格字幕清晰，探店转化话术自然带出。",
    tagsJson: JSON.stringify(["#探店", "#小吃", "#商场美食", "#测评", "#本地生活"]),
    likes: 56000,
    comments: 4100,
    favorites: 8900,
    url: "https://www.douyin.com/video/7300000000000000003",
  },
  {
    platform: "抖音",
    category: "知识干货",
    title: "剪映 3 个隐藏功能省一半时间",
    contentBody: "屏幕录制加快捷键提示，适合工具类教程收藏向。",
    tagsJson: JSON.stringify(["#剪映", "#剪辑教程", "#效率", "#自媒体", "#干货"]),
    likes: 32000,
    comments: 1800,
    favorites: 52000,
    url: "https://www.douyin.com/video/7300000000000000009",
  },
  {
    platform: "抖音",
    category: "好物种草",
    title: "桌面收纳一件封神实测",
    contentBody: "十五秒结论先行，价格锚点明确，适合短视频带货脚本。",
    tagsJson: JSON.stringify(["#收纳", "#桌面", "#种草", "#性价比", "#租房"]),
    likes: 41000,
    comments: 2600,
    favorites: 12000,
    url: "https://www.douyin.com/video/7300000000000000006",
  },
  {
    platform: "小红书",
    category: "美妆穿搭",
    title: "黄皮通勤口红三支就够一周",
    contentBody: "手背试色拼图加场景地铁办公室，弱硬广强对比。",
    tagsJson: JSON.stringify(["#口红", "#黄皮", "#通勤妆", "#试色", "#OOTD"]),
    likes: 12000,
    comments: 800,
    favorites: 19000,
    url: "https://www.xiaohongshu.com/explore/66c0demo00010002note02",
  },
  {
    platform: "小红书",
    category: "生活日常",
    title: "早起一小时家务极简流程",
    contentBody: "清单体前后对比图，评论区高频追问计时器类互动。",
    tagsJson: JSON.stringify(["#极简", "#家务", "#早起", "#生活记录", "#自律"]),
    likes: 8900,
    comments: 620,
    favorites: 8100,
    url: "https://www.xiaohongshu.com/explore/66c0demo00010001note01",
  },
  {
    platform: "小红书",
    category: "知识干货",
    title: "Excel 透视表三分钟做周报",
    contentBody: "步骤截图编号，强调空行与合并单元格常见坑。",
    tagsJson: JSON.stringify(["#Excel", "#透视表", "#周报", "#办公技巧", "#效率"]),
    likes: 15000,
    comments: 1100,
    favorites: 28000,
    url: "https://www.xiaohongshu.com/explore/66c0demo00010004note04",
  },
  {
    platform: "小红书",
    category: "情感文案",
    title: "写给总是懂事的那个人",
    contentBody: "短段落留白排版，评论区故事接龙型互动设计。",
    tagsJson: JSON.stringify(["#情感", "#共鸣", "#治愈", "#文案", "#关系"]),
    likes: 22000,
    comments: 5600,
    favorites: 4300,
    url: "https://www.xiaohongshu.com/explore/66c0demo00010005note05",
  },
];
