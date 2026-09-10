/**
 * AI Disaster Analysis Assistant — LLM Streaming API Client
 *
 * 核心功能：
 * - 通过 Express BFF 调用已发布 ai-workflow 或火山方舟模型服务
 * - 流式输出（SSE / ReadableStream）实现逐字打印效果
 * - 自动注入灾害实时上下文，提供 Demo 降级模式（无 API Key 时）
 */

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  isComplete?: boolean;
  isCancelled?: boolean;
}

export interface DisasterContext {
  total: number;
  byType: Record<string, number>;
  recent: Array<{
    title: string;
    type: string;
    severity?: string;
    timestamp?: string;
    magnitude?: number;
  }>;
}

const AI_CHAT_ENDPOINT = "/api/ai/chat";

const DEMO_FALLBACK_CODES = new Set(["AI_PROVIDER_NOT_CONFIGURED", "AI_MODEL_MISSING"]);

export type AIStreamOutcome =
  | { kind: "completed" }
  | { kind: "cancelled" }
  | { kind: "failed"; message: string };

export interface StreamChatOptions {
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
}

const STREAM_ERROR = "AI 响应异常，请重试。";
const INCOMPLETE_STREAM_ERROR = "AI 响应流意外中断，请重试。";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readChatCompletionEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  options: StreamChatOptions,
): Promise<AIStreamOutcome> {
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  let cancellation: Promise<void> | undefined;
  const cancel = () => {
    cancellation ??= reader.cancel().catch(() => undefined);
    return cancellation;
  };
  const onAbort = () => {
    void cancel();
  };

  function processEvent(event: string): boolean {
    if (options.signal?.aborted) return false;
    const data: string[] = [];
    let eventType = "";
    for (const line of event.split(/\r?\n/)) {
      if (line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
      if (field === "data") data.push(value);
      if (field === "event") eventType = value;
    }
    if (eventType === "error") throw new Error(STREAM_ERROR);
    if (data.length === 0) return false;
    const payload = data.join("\n");
    if (payload.trim() === "[DONE]") return true;
    const parsed: unknown = JSON.parse(payload);
    if (!isRecord(parsed) || "error" in parsed) throw new Error(STREAM_ERROR);
    const choice: unknown = Array.isArray(parsed.choices) ? parsed.choices[0] : undefined;
    const delta = isRecord(choice) ? choice.delta : undefined;
    if (isRecord(delta) && typeof delta.content === "string" && delta.content) {
      options.onChunk(delta.content);
    }
    return false;
  }

  options.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    while (true) {
      if (options.signal?.aborted) return { kind: "cancelled" };
      const { done, value } = await reader.read();
      if (options.signal?.aborted) return { kind: "cancelled" };
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const event = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (processEvent(event)) {
          completed = true;
          return { kind: "completed" };
        }
        if (options.signal?.aborted) return { kind: "cancelled" };
      }
      if (done) {
        completed = processEvent(buffer);
        if (options.signal?.aborted) return { kind: "cancelled" };
        return completed
          ? { kind: "completed" }
          : { kind: "failed", message: INCOMPLETE_STREAM_ERROR };
      }
    }
  } catch {
    return options.signal?.aborted
      ? { kind: "cancelled" }
      : { kind: "failed", message: STREAM_ERROR };
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    try {
      if (!completed) await cancel();
    } finally {
      reader.releaseLock();
    }
  }
}

// ─── 主流式请求函数 ──────────────────────────────────────────────────────────

export async function streamChatMessage(
  messages: readonly ChatMessage[],
  context: DisasterContext | undefined,
  options: StreamChatOptions,
): Promise<AIStreamOutcome> {
  if (options.signal?.aborted) return { kind: "cancelled" };
  try {
    const resp = await fetch(AI_CHAT_ENDPOINT, {
      method: "POST",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        disasterContext: context ?? null,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      let code = "";

      try {
        const parsed: unknown = JSON.parse(text);
        if (isRecord(parsed) && typeof parsed.code === "string") code = parsed.code;
      } catch {
        // Non-JSON error bodies must not be exposed to the caller.
      }

      if (options.signal?.aborted) return { kind: "cancelled" };
      if (resp.status === 503 && DEMO_FALLBACK_CODES.has(code)) {
        return await runDemoMode(messages, context, options);
      }

      return { kind: "failed", message: `AI 请求失败 (${resp.status})，请稍后重试。` };
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      return options.signal?.aborted
        ? { kind: "cancelled" }
        : { kind: "failed", message: "无法读取 AI 响应流，请重试。" };
    }

    return await readChatCompletionEvents(reader, options);
  } catch {
    return options.signal?.aborted
      ? { kind: "cancelled" }
      : { kind: "failed", message: "网络请求失败，请检查网络连接。" };
  }
}

// ─── Demo 演示模式（无 API Key 时的降级响应）────────────────────────────────

const DEMO_RESPONSES: Array<{
  keywords: string[];
  build: (ctx?: DisasterContext) => string;
}> = [
  {
    keywords: ["地震", "earthquake", "震级", "震源"],
    build: (ctx) => `**🌍 地震风险分析报告**

**当前态势**
${ctx ? `平台正在监控 **${ctx.total}** 条活跃事件` : ""}，地震活动呈现以下特征：

**高风险区域**
- 🔴 **环太平洋火圈**：日本、菲律宾、印度尼西亚沿海板块边界
- 🟠 **欧亚地震带**：土耳其、伊朗、尼泊尔一带
- 🟡 **洋中脊系统**：大西洋中脊持续低烈度微震活动

**近期趋势研判**
- 西太平洋板块边界本月记录 M3.0 以上地震频次较均值高出约 **18%**
- 余震序列需关注 7 天内 M4.5+ 事件触发次生灾害风险

**应急响应建议**
1. 沿海低洼地区保持**海啸预警**就绪状态
2. 启动建筑结构安全自查，重点关注老旧房屋
3. 储备 **72 小时**应急物资（食水、急救包、通讯设备）
4. 确认家庭/单位紧急疏散集合点`,
  },
  {
    keywords: ["洪水", "flood", "暴雨", "河流", "水位"],
    build: (ctx) => `**🌊 洪水风险分析报告**

**当前水文态势**
${ctx?.byType["FLOOD"] ? `当前平台监控洪水事件 **${ctx.byType["FLOOD"]} 起**，` : ""}洪水威胁主要集中于：

**高风险地区**
- 🔴 **南亚季风带**：孟加拉国、印度东北部、缅甸
- 🟠 **东南亚低洼流域**：湄公河三角洲、爪哇岛北部
- 🟡 **非洲萨赫勒地区**：尼日尔河流域季节性泛滥

**驱动因素分析**
- 厄尔尼诺/拉尼娜周期异常导致部分地区降雨量较历史均值偏高 **30-50%**
- 城市化进程加速地表径流，洪涝风险持续上升

**关键行动建议**
1. 提前疏散河流 **1km** 缓冲区内低洼居民
2. 加强水库泄洪调度，保持**20%**以上防洪库容
3. 部署快速响应舟桥救援队于重点区域
4. 检查城市排水管网承载能力`,
  },
  {
    keywords: ["野火", "wildfire", "fire", "火灾", "森林火"],
    build: () => `**🔥 野火风险分析报告**

**当前火情态势**

**高危区域**
- 🔴 **北美西海岸**：加州、俄勒冈，干旱 + 强风双重驱动
- 🟠 **地中海气候带**：西班牙、希腊、摩洛哥
- 🟡 **澳大利亚东南部**：维多利亚州灌木丛进入高风险季节

**风险驱动因素**
- 连续高温（≥40°C）导致植被含水率跌破 **8%** 临界值
- 大气干燥，相对湿度低于 **15%**，火焰蔓延速度加倍

**防控建议**
1. 划定并管控 **30m** 防火隔离带
2. 禁止在高风险期野外明火作业
3. 预部署航空灭火力量（固定翼 + 直升机）
4. 启动社区野火应急疏散演练`,
  },
  {
    keywords: ["分析", "概况", "总结", "综合", "报告", "态势", "风险"],
    build: (ctx) => {
      const total = ctx?.total ?? 0;
      const top3 = ctx
        ? Object.entries(ctx.byType)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([t, n]) => `**${t}** ${n} 起`)
            .join("、")
        : "暂无数据";
      return `**🛰️ 全球灾害态势综合分析**

**数据快照（${new Date().toLocaleDateString("zh-CN")}）**
| 指标 | 数值 |
|------|------|
| 活跃监控事件 | **${total} 条** |
| 主要灾害类型 | ${top3} |
| 数据源接入 | USGS · NASA EONET · GDACS · DisasterAware |

**地区风险分级**
- 🔴 **高风险**：东南亚（洪水 + 风暴复合灾害）、中美洲（飓风季）
- 🟠 **中高风险**：环太平洋地震带、地中海野火带
- 🟡 **中风险**：南亚（干旱）、非洲萨赫勒（洪涝）
- 🟢 **低风险**：北欧、加拿大北部

**趋势研判**
受气候变化影响，近5年极端天气事件频率上升约 **23%**，复合灾害（多灾种叠加）风险显著增大。建议加强跨国跨境协同预警机制，提升早期预警覆盖率至 **100%**。

**优先行动**
1. 强化热带气旋路径实时追踪
2. 建立跨境洪水联合预警数据共享协议
3. 完善极端高温事件公众通报系统`;
    },
  },
  {
    keywords: ["火山", "volcano", "喷发", "熔岩"],
    build: (ctx) => `**🌋 火山活动分析报告**

**活跃火山监控**
${ctx?.byType["VOLCANO"] ? `当前监控活跃火山事件 **${ctx.byType["VOLCANO"]} 起**。` : ""}

**重点监控对象**
- 🔴 **基拉韦厄（夏威夷）**：持续低强度喷发，熔岩流向东南方向
- 🟠 **默拉皮（印尼）**：火山地震活动增强，进入橙色预警状态
- 🟡 **埃特纳（意大利）**：阵发性喷发，火山灰飘散影响航空

**次生灾害风险**
- 火山灰云 → 航空中断（影响半径 500km）
- 熔岩流 → 居民点迁移
- 火山碎屑流 → 20km 内极高危

**应对措施**
1. 划定 **5km / 10km / 20km** 三级疏散禁区
2. 向下风向民众发放 N95 防护口罩
3. 实时监控 SO₂ 排放量，超 5000 t/day 立即升级预警`,
  },
];

async function runDemoMode(
  messages: readonly ChatMessage[],
  ctx: DisasterContext | undefined,
  options: StreamChatOptions,
): Promise<AIStreamOutcome> {
  const last = messages[messages.length - 1]?.content?.toLowerCase() ?? "";

  let response = "";

  // 匹配关键词选择预设响应
  for (const template of DEMO_RESPONSES) {
    if (template.keywords.some((k) => last.includes(k))) {
      response = template.build(ctx);
      break;
    }
  }

  // 默认欢迎响应
  if (!response) {
    response = `**👋 你好，我是 Prometheus AI 灾害分析助手**

我基于 **LLM 大语言模型** 驱动，可以帮助你：

| 功能 | 说明 |
|------|------|
| 📊 态势分析 | 解读平台实时灾害监控数据 |
| ⚠️ 风险评估 | 评估特定地区或灾害类型威胁等级 |
| 🔮 趋势预测 | 基于历史数据研判灾害发展走势 |
| 🚨 应急建议 | 提供具体可操作的应对策略 |
| 🌍 专项分析 | 地震 · 洪水 · 野火 · 火山 · 风暴深度报告 |

${ctx ? `📡 当前平台正在监控 **${ctx.total} 条**活跃灾害事件。` : ""}

> 💡 **提示**：你可以点击下方快捷问题，或直接输入想了解的内容。
>
> ⚙️ **配置真实 LLM**：在 \`.env\` 中设置 \`VOLCENGINE_ARK_API_KEY\` 和 \`VOLCENGINE_ARK_MODEL\`，由 Express BFF 调用火山方舟模型服务（当前为 Demo 演示模式）。`;
  }

  // 逐字流式输出，模拟打字效果
  const chars = response.split("");
  for (let i = 0; i < chars.length; i++) {
    if (options.signal?.aborted) return { kind: "cancelled" };
    options.onChunk(chars[i]);
    // 每隔几个字符稍作延迟，营造流畅打字感
    if (i % 4 === 0) {
      await waitForDemoChunk(options.signal);
    }
  }
  return options.signal?.aborted ? { kind: "cancelled" } : { kind: "completed" };
}

function waitForDemoChunk(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, 6);
    signal?.addEventListener("abort", finish, { once: true });
  });
}
