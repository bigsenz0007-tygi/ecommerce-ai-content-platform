/**
 * 多模型 OpenAI 兼容调用：豆包 / Kimi / DeepSeek / OpenAI(ChatGPT)。
 * 用于对标内容理解与仿写生成；未配置任何 Key 时返回 null，由 pipeline 回退 mock。
 */

export type AiTextBundle = {
  title: string;
  body: string;
  imagePrompt: string;
  videoScript: string;
};

type ChatMessagePayload =
  | { role: "system" | "user"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

type ProviderConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  supportsVision: boolean;
};

function parseJsonObject<T extends Record<string, unknown>>(text: string): T | null {
  const raw = text.trim();
  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function postChatCompletions(args: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessagePayload[];
  temperature?: number;
}): Promise<string> {
  const endpoint = `${args.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      temperature: args.temperature ?? 0.65,
      messages: args.messages,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AI ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

function collectProviders(): ProviderConfig[] {
  const list: ProviderConfig[] = [];
  if (process.env.DOUBAO_API_KEY && process.env.DOUBAO_MODEL) {
    list.push({
      name: "doubao",
      baseUrl: process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
      apiKey: process.env.DOUBAO_API_KEY,
      model: process.env.DOUBAO_MODEL,
      supportsVision: process.env.DOUBAO_VISION !== "0",
    });
  }
  if (process.env.KIMI_API_KEY && process.env.KIMI_MODEL) {
    list.push({
      name: "kimi",
      baseUrl: process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1",
      apiKey: process.env.KIMI_API_KEY,
      model: process.env.KIMI_MODEL,
      supportsVision: process.env.KIMI_VISION === "1",
    });
  }
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_MODEL) {
    list.push({
      name: "deepseek",
      baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL,
      supportsVision: false,
    });
  }
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) {
    list.push({
      name: "openai",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
      supportsVision: process.env.OPENAI_VISION !== "0",
    });
  }
  return list;
}

/** 抓取链接前几 KB 纯文本，供模型理解（可能被目标站拒绝，失败则仅用 URL） */
export async function fetchUrlTextPreview(url: string, maxChars = 8000): Promise<string> {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TygiContentBot/1.0; +https://example.com/bot)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(t);
    if (!res.ok) return "";
    const html = await res.text();
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.slice(0, maxChars);
  } catch {
    return "";
  }
}

/**
 * 理解对标：链接摘要 + 可选截图多模态（首个支持 vision 的 provider）。
 */
export async function analyzeBenchmarkForMimic(params: {
  link?: string;
  linkPreview?: string;
  imageDataUrl?: string;
  /** 用户填写的互动/转化侧写，偏主观即可 */
  userNotes?: string;
}): Promise<string | null> {
  const providers = collectProviders();
  const system =
    "你是内容策略分析师。根据用户提供的对标链接说明与/或截图，输出一段中文「对标要点」摘要（结构、语气、钩子、话题标签风格），不超过 600 字。不要编造具体数据。只输出摘要正文，不要 JSON。若用户补充了互动或转化侧写，请在摘要中体现其对内容侧重点的暗示（如偏涨粉、偏互动、偏成交等），但仍不得捏造访问量、销售额等数字。";

  const textBlock = [
    params.link ? `用户对标链接：${params.link}` : "",
    params.linkPreview ? `链接可抓取文本片段：\n${params.linkPreview}` : "",
    params.userNotes?.trim() ? `用户补充（互动/成交主观描述）：\n${params.userNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const hasImage = !!params.imageDataUrl?.startsWith("data:image");

  for (const p of providers) {
    try {
      if (hasImage && p.supportsVision) {
        const content: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        > = [
          { type: "text", text: `${system}\n\n${textBlock || "用户仅上传截图，无链接。"}` },
          { type: "image_url", image_url: { url: params.imageDataUrl! } },
        ];
        const raw = await postChatCompletions({
          baseUrl: p.baseUrl,
          apiKey: p.apiKey,
          model: p.model,
          messages: [{ role: "user", content }],
          temperature: 0.4,
        });
        if (raw) return raw;
      } else if (!hasImage && textBlock) {
        const raw = await postChatCompletions({
          baseUrl: p.baseUrl,
          apiKey: p.apiKey,
          model: p.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: textBlock },
          ],
          temperature: 0.4,
        });
        if (raw) return raw;
      }
    } catch {
      continue;
    }
  }

  if (textBlock || hasImage) {
    const userText =
      textBlock ||
      (hasImage ? "用户上传了对标截图，但当前未配置可访问链接文本；请结合截图理解。" : "");
    for (const p of providers) {
      if (hasImage && p.supportsVision) continue;
      try {
        const raw = await postChatCompletions({
          baseUrl: p.baseUrl,
          apiKey: p.apiKey,
          model: p.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userText },
          ],
          temperature: 0.4,
        });
        if (raw) return raw;
      } catch {
        continue;
      }
    }
  }

  return null;
}

export async function generateTextBundleWithBenchmark(params: {
  platform: string;
  accountName: string;
  categoryName: string;
  objective: string;
  contentFormat: string;
  advancedHints?: string;
  benchmarkSummary: string;
}): Promise<AiTextBundle | null> {
  const providers = collectProviders();
  if (providers.length === 0) return null;

  const systemPrompt =
    "你是资深中文内容策划。必须严格模仿用户给定的「对标要点」的结构与语气，但不得抄袭原句；内容需原创、合规、可发布。只输出 JSON：{\"title\",\"body\",\"imagePrompt\",\"videoScript\"}，不要其它文字。";

  const userPrompt = [
    `平台: ${params.platform}`,
    `账号: ${params.accountName}`,
    `品类: ${params.categoryName}`,
    `目标: ${params.objective}`,
    `内容形式: ${params.contentFormat}`,
    `对标要点:\n${params.benchmarkSummary}`,
    params.advancedHints ? `其它约束:\n${params.advancedHints}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  for (const p of providers) {
    try {
      const raw = await postChatCompletions({
        baseUrl: p.baseUrl,
        apiKey: p.apiKey,
        model: p.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const parsed = parseJsonObject<Partial<AiTextBundle>>(raw);
      if (
        parsed?.title &&
        parsed.body &&
        parsed.imagePrompt &&
        parsed.videoScript
      ) {
        return {
          title: parsed.title,
          body: parsed.body,
          imagePrompt: parsed.imagePrompt,
          videoScript: parsed.videoScript,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}
