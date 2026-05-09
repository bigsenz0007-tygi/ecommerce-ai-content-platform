/**
 * 各平台素材规格（推荐值，实际以官方后台/公告为准，会随平台改版而变化）。
 * 用于本系统：生成提示、裁切比例、导出尺寸参考。
 */

export type PlatformId = "taobao" | "douyin" | "xiaohongshu" | "jd";

export type PresetKind = "image" | "video_frame";

export interface SizePreset {
  id: string;
  name: string;
  /** 目标像素宽 */
  width: number;
  /** 目标像素高 */
  height: number;
  kind: PresetKind;
  /** 简短说明 */
  notes?: string;
}

export interface PlatformSpec {
  id: PlatformId;
  label: string;
  /** 接入说明：本系统侧重「按规范生产素材」；「一键代发」需单独申请各平台开放接口 */
  integrationNote: string;
  presets: SizePreset[];
}

/** 宽高比 = width / height */
export function aspectOf(p: SizePreset): number {
  return p.width / p.height;
}

export const PLATFORMS: PlatformSpec[] = [
  {
    id: "taobao",
    label: "淘宝 / 天猫",
    integrationNote:
      "商品素材以商家后台上传为主。千牛/开放平台提供部分能力，多需企业资质与审核；本系统可先完成主图、详情页长图尺寸适配与下载。",
    presets: [
      {
        id: "tb-main-1-1",
        name: "商品主图（常见）",
        width: 800,
        height: 800,
        kind: "image",
        notes: "1:1，多类目通用；部分行业有更高像素要求请到类目规则确认",
      },
      {
        id: "tb-main-3-4",
        name: "主图 / 场景图（3:4）",
        width: 750,
        height: 1000,
        kind: "image",
        notes: "常用于竖版主图或活动位素材",
      },
      {
        id: "tb-detail-segment",
        name: "详情分段（示例 3:4）",
        width: 790,
        height: 1053,
        kind: "image",
        notes: "详情多为长图；可按该比例分段裁切后纵向拼接",
      },
    ],
  },
  {
    id: "douyin",
    label: "抖音",
    integrationNote:
      "短视频与商品素材以抖音电商、创作者中心为主。抖音开放平台对应用/店铺有准入与审核；本系统可先输出 9:16 成片规格与封面帧裁切。",
    presets: [
      {
        id: "dy-video-9-16",
        name: "短视频（竖屏）",
        width: 1080,
        height: 1920,
        kind: "video_frame",
        notes: "电商短视频常用 9:16，具体码率与时长以发布页提示为准",
      },
      {
        id: "dy-cover-3-4",
        name: "商品封面 / 信息流 3:4",
        width: 720,
        height: 960,
        kind: "image",
        notes: "部分场景使用竖版静态图或封面",
      },
    ],
  },
  {
    id: "xiaohongshu",
    label: "小红书",
    integrationNote:
      "笔记图片以 3:4、1:1 为常见。专业号/蒲公英等有接口能力，普遍需资质；本系统可先按笔记规格批量化出图与裁切。",
    presets: [
      {
        id: "xhs-note-3-4",
        name: "笔记配图（3:4）",
        width: 1242,
        height: 1660,
        kind: "image",
        notes: "常见推荐比例之一，请以最新创作者中心说明为准",
      },
      {
        id: "xhs-note-1-1",
        name: "笔记配图（1:1）",
        width: 1080,
        height: 1080,
        kind: "image",
        notes: "封面或宫格中单图",
      },
    ],
  },
  {
    id: "jd",
    label: "京东",
    integrationNote:
      "商品主图、详情以京麦/商家后台为准；京麦开放能力需店铺与接口权限；本系统可提供主图等固定比例裁切与导出。",
    presets: [
      {
        id: "jd-main-1-1",
        name: "商品主图",
        width: 800,
        height: 800,
        kind: "image",
        notes: "常见 1:1 白底/场景主图规格，类目细则以京东规则为准",
      },
      {
        id: "jd-main-16-9",
        name: "部分场景宽屏",
        width: 800,
        height: 450,
        kind: "image",
        notes: "按活动/类目选用，裁切前请核对当前活动素材要求",
      },
    ],
  },
];

export function getPlatform(id: PlatformId): PlatformSpec | undefined {
  return PLATFORMS.find((p) => p.id === id);
}
