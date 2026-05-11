/** 随便生 / 精准生 共用：平台、赛道、目标、格式、风格（与 PRD 一致） */

export const PLATFORM_CHOICES = ["抖音", "小红书"] as const;
export type PlatformChoice = (typeof PLATFORM_CHOICES)[number];

export const CATEGORY_TRACK_NAMES = [
  "生活日常",
  "美妆穿搭",
  "美食探店",
  "知识干货",
  "情感文案",
  "好物种草",
  "娱乐剧情",
  "职场创业",
] as const;
export type CategoryTrack = (typeof CATEGORY_TRACK_NAMES)[number];

export const CONTENT_GOALS = ["涨粉引流", "带货转化", "品牌曝光", "互动种草"] as const;
export type ContentGoal = (typeof CONTENT_GOALS)[number];

export const CONTENT_FORMATS = ["图文笔记", "短视频脚本", "口播文案", "合集系列"] as const;
export type ContentFormatLabel = (typeof CONTENT_FORMATS)[number];

export const CONTENT_STYLES = ["真实种草", "干货教程", "情绪共鸣", "测评对比", "故事剧情"] as const;
export type ContentStyle = (typeof CONTENT_STYLES)[number];
