/**
 * 对标数据扩展约定（便于后续接库 / 埋点 / 运营导出）。
 * 当前请求体字段见 `benchmarkSupplement`；入库时可收敛为该结构 V1。
 */
export type BenchmarkContributionV1 = {
  url: string;
  platform?: "小红书" | "抖音";
  og?: { title?: string; description?: string; image?: string };
  userSupplement?: {
    /** 点赞、评论、收藏、完播等主观描述 */
    interaction?: string;
    /** 带货、私信、导流、转化话术等 */
    conversion?: string;
  };
  capturedAt?: string;
};

export type BenchmarkSupplementInput = {
  interaction?: string;
  conversion?: string;
};
