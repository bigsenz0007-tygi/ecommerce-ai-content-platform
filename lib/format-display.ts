/** 列表/审核页：根据内容格式判断是否展示图/视频预览 */
export function isImageLikeContentFormat(format: string): boolean {
  return format === "图文笔记" || format === "合集系列" || format === "图文";
}

export function isVideoLikeContentFormat(format: string): boolean {
  return format === "短视频脚本" || format === "视频文字";
}

export function isTextOnlyContentFormat(format: string): boolean {
  return format === "口播文案" || format === "纯文字";
}
