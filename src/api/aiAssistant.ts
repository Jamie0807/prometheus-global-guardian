/**
 * AI Disaster Analysis Assistant — LLM Streaming API Client
 *
 * 核心功能：
 * - 基于火山方舟 / OpenAI-compatible Chat Completions API
 * - 流式输出（SSE / ReadableStream）实现逐字打印效果
 * - 自动注入灾害实时上下文，提供 Demo 降级模式（无 API Key 时）
 */

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
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

import { resolveAIProviderConfig } from './aiProviderConfig';

// ─── 环境配置 ────────────────────────────────────────────────────────────────

const AI_PROVIDER = resolveAIProviderConfig((import.meta as any).env ?? {});

// ─── Miaoma AI Flow 工作流引擎配置 ──────────────────────────────────────────
// 优先级：ai-flow 工作流引擎 > 直连 OpenAI > Demo 降级模式
const AI_FLOW_API_URL      = (import.meta as any).env?.VITE_AI_FLOW_API_URL      ?? '';   // e.g. http://localhost:3001
const AI_FLOW_API_KEY      = (import.meta as any).env?.VITE_AI_FLOW_API_KEY      ?? '';   // NestJS API Key 守卫鉴权
const AI_FLOW_WORKFLOW_ID  = (import.meta as any).env?.VITE_AI_FLOW_WORKFLOW_ID  ?? '';   // 已发布的灾害分析工作流 ID

// ─── System Prompt 构建 ──────────────────────────────────────────────────────

function buildSystemPrompt(ctx?: DisasterContext): string {
  let prompt = `你是 Prometheus Global Guardian 平台的 AI 灾害分析助手（Powered by LLM）。
你的专业领域：全球灾害监控、风险评估、应急响应分析与减灾策略。

职责范围：
• 解读平台实时灾害监控数据，提供专业态势研判
• 对地震、火山、洪水、风暴、野火、干旱、海啸等灾害进行深度分析
• 基于历史数据与当前态势，研判灾害发展趋势
• 提供具体、可操作的应急响应建议与减灾策略
• 解答灾害科学相关专业问题

输出规范：使用结构化 Markdown 格式（标题、要点列表），语言简洁专业，关键数据加粗。`;

  if (ctx && ctx.total > 0) {
    const topTypes = Object.entries(ctx.byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([t, n]) => `${t}(${n})`)
      .join('、');

    const recentStr = ctx.recent
      .slice(0, 4)
      .map(h => `「${h.title}」${h.type}${h.severity ? ' ' + h.severity : ''}${h.magnitude ? ' M' + h.magnitude : ''}`)
      .join('；');

    prompt += `

---
📡 **平台实时数据上下文（${new Date().toLocaleString('zh-CN')}）**
- 活跃监控事件总数：**${ctx.total} 条**
- 灾害类型分布：${topTypes}
- 近期代表事件：${recentStr || '暂无'}

请在分析时优先结合以上实时数据，提供具有针对性的研判。`;
  }

  return prompt;
}

// ─── AI Flow 工作流引擎调用 ──────────────────────────────────────────
/**
 * 调用 ai-flow 的 NestJS API Server（POST /workflow/run）
 * 由 ai-engine 基于 LangGraph DAG 执行工作流，支持 LLM / RAG / Condition 节点编排
 * 返回完整执行结果后，前端模拟流式逐字输出
 */
async function streamViaAIFlow(
  messages: ChatMessage[],
  context: DisasterContext | undefined,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content ?? '';
  const chatHistory = messages
    .filter(m => m.role !== 'system')
    .slice(-6)
    .map(m => ({ role: m.role, content: m.content }));

  try {
    const resp = await fetch(`${AI_FLOW_API_URL}/workflow/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_FLOW_API_KEY,          // NestJS api-key.guard.ts 鉴权
      },
      body: JSON.stringify({
        workflowId: AI_FLOW_WORKFLOW_ID,        // 已发布的灾害分析工作流 ID
        input: {
          userMessage: lastUserMessage,         // 用户当前输入
          disasterContext: context ?? null,     // 平台实时灾害上下文（注入 System Prompt）
          chatHistory,                          // 多轮对话历史（最近 6 条）
        },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      onError(`ai-flow API 请求失败 (${resp.status}): ${text}`);
      return;
    }

    const data = await resp.json();
    // ai-flow 返回统一格式 { data: { output: string } }（transform.interceptor.ts）
    const output: string = data?.data?.output ?? data?.output ?? JSON.stringify(data);

    // 工作流返回完整文本，前端模拟流式逐字输出（每 4 字符延迟 8ms，还原打字机体验）
    const chars = output.split('');
    for (let i = 0; i < chars.length; i++) {
      onChunk(chars[i]);
      if (i % 4 === 0) await new Promise(r => setTimeout(r, 8));
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'ai-flow 工作流引擎连接失败，请检查服务状态');
  }
}

// ─── 主流式请求函数 ──────────────────────────────────────────────────────────

export async function streamChatMessage(
  messages: ChatMessage[],
  context: DisasterContext | undefined,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  /**
   * 备注：
   * 1) 直连模型时，采用 fetch + ReadableStream 手写 SSE 解析：
   *    - stream: true 发起流式请求
   *    - resp.body.getReader() 持续 read() 读取分片
   *    - 按 "data: ...\n\n" 协议行解析，提取 delta.content 增量渲染
   * 2) 走 ai-flow 工作流时，不是后端 SSE 推流，而是拿到完整文本后前端模拟打字机流。
   */
  // 优先级 1：ai-flow 工作流引擎（LangGraph DAG 编排，支持 RAG + 条件分支）
  if (AI_FLOW_API_URL && AI_FLOW_API_KEY) {
    await streamViaAIFlow(messages, context, onChunk, onDone, onError);
    return;
  }

  // 优先级 2：无 ai-flow 时直连火山方舟 / OpenAI-compatible 服务，无 API Key 时进入 Demo 演示模式
  if (!AI_PROVIDER.apiKey) {
    await runDemoMode(messages, context, onChunk, onDone);
    return;
  }

  if (AI_PROVIDER.missingModel) {
    onError('火山方舟模型未配置，请在 .env 中设置 VITE_VOLCENGINE_ARK_MODEL');
    return;
  }

  const payload = {
    model: AI_PROVIDER.model,
    stream: true,
    temperature: 0.7,
    max_tokens: 1500,
    messages: [
      { role: 'system', content: buildSystemPrompt(context) },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
  };

  try {
    const resp = await fetch(AI_PROVIDER.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_PROVIDER.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      onError(`${AI_PROVIDER.providerName} API 请求失败 (${resp.status}): ${text}`);
      return;
    }

    // OpenAI 的流式响应是一个 SSE（Server-Sent Events）格式的 ReadableStream，需要逐行解析
    // reader是 ReadableStreamDefaultReader 类型，提供 read() 方法读取流式数据块
    const reader = resp.body?.getReader();
    // 如果没有响应体或无法获取 reader，直接报错
    if (!reader) { onError('无法读取响应流'); return; }

    // SSE 格式解析，逐行处理流式输出
    const decoder = new TextDecoder();
    let buf = '';

    // OpenAI SSE 格式：data: {json}\n\n，最后以 data: [DONE] 结尾
    while (true) {
      const { done, value } = await reader.read();
      //reader.read 返回一个 Promise，解析为 { done: boolean, value: Uint8Array }，done=true 代表流结束
      if (done) break;
      //buf 是上一次残留的字符串，decoder.decode(value, { stream: true }) 是本次新读取的字符串，两者拼接后再按行分割处理
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        const t = line.trim();
        if (!t || t === 'data: [DONE]') continue;
        if (!t.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(t.slice(6));
          const delta: string | undefined = json.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch { /* skip malformed chunks */ }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : '网络请求失败，请检查网络连接');
  }
}

// ─── Demo 演示模式（无 API Key 时的降级响应）────────────────────────────────

const DEMO_RESPONSES: Array<{
  keywords: string[];
  build: (ctx?: DisasterContext) => string;
}> = [
  {
    keywords: ['地震', 'earthquake', '震级', '震源'],
    build: (ctx) => `**🌍 地震风险分析报告**

**当前态势**
${ctx ? `平台正在监控 **${ctx.total}** 条活跃事件` : ''}，地震活动呈现以下特征：

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
    keywords: ['洪水', 'flood', '暴雨', '河流', '水位'],
    build: (ctx) => `**🌊 洪水风险分析报告**

**当前水文态势**
${ctx?.byType['FLOOD'] ? `当前平台监控洪水事件 **${ctx.byType['FLOOD']} 起**，` : ''}洪水威胁主要集中于：

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
    keywords: ['野火', 'wildfire', 'fire', '火灾', '森林火'],
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
    keywords: ['分析', '概况', '总结', '综合', '报告', '态势', '风险'],
    build: (ctx) => {
      const total = ctx?.total ?? 0;
      const top3 = ctx
        ? Object.entries(ctx.byType)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([t, n]) => `**${t}** ${n} 起`)
            .join('、')
        : '暂无数据';
      return `**🛰️ 全球灾害态势综合分析**

**数据快照（${new Date().toLocaleDateString('zh-CN')}）**
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
    keywords: ['火山', 'volcano', '喷发', '熔岩'],
    build: (ctx) => `**🌋 火山活动分析报告**

**活跃火山监控**
${ctx?.byType['VOLCANO'] ? `当前监控活跃火山事件 **${ctx.byType['VOLCANO']} 起**。` : ''}

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
  messages: ChatMessage[],
  ctx: DisasterContext | undefined,
  onChunk: (c: string) => void,
  onDone: () => void
): Promise<void> {
  const last = messages[messages.length - 1]?.content?.toLowerCase() ?? '';

  let response = '';

  // 匹配关键词选择预设响应
  for (const template of DEMO_RESPONSES) {
    if (template.keywords.some(k => last.includes(k))) {
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

${ctx ? `📡 当前平台正在监控 **${ctx.total} 条**活跃灾害事件。` : ''}

> 💡 **提示**：你可以点击下方快捷问题，或直接输入想了解的内容。
> 
> ⚙️ **配置真实 LLM**：在 \`.env\` 中设置 \`VITE_VOLCENGINE_ARK_API_KEY\` 和 \`VITE_VOLCENGINE_ARK_MODEL\` 即可启用火山方舟模型服务（当前为 Demo 演示模式）。`;
  }

  // 逐字流式输出，模拟打字效果
  const chars = response.split('');
  for (let i = 0; i < chars.length; i++) {
    onChunk(chars[i]);
    // 每隔几个字符稍作延迟，营造流畅打字感
    if (i % 4 === 0) {
      await new Promise(r => setTimeout(r, 6));
    }
  }
  onDone();
}

// ─── 工具函数 ────────────────────────────────────────────────────────────────

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/** 预设快捷提问 */
export const QUICK_PROMPTS = [
  { label: '🌍 全球态势综合分析', text: '请对当前全球灾害态势进行综合分析，包括风险分级和优先行动建议。' },
  { label: '🌊 洪水风险研判', text: '请分析当前全球洪水风险，重点区域和应急响应建议是什么？' },
  { label: '🌋 地震活动评估', text: '请评估当前全球地震活动情况，哪些地区需要重点关注？' },
  { label: '🔥 野火威胁分析', text: '目前全球野火威胁情况如何？有哪些高危区域和防控措施？' },
  { label: '📈 近期趋势预测', text: '基于当前数据，未来 7 天全球主要灾害类型的趋势预测是什么？' },
  { label: '🚨 应急响应指南', text: '针对当前监控到的高危灾害，请给出具体的应急响应优先级清单。' },
];
