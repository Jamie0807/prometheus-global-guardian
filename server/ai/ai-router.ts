import type { ChatMessage, DisasterContext } from './ai-provider.js';

export type AIRouteTarget = 'workflow' | 'volcengine';

export interface AIRouteDecision {
  target: AIRouteTarget;
  reason: 'knowledge_base' | 'disaster_domain' | 'live_context' | 'general';
  matchedSignals: string[];
}

interface RouteRule {
  reason: Exclude<AIRouteDecision['reason'], 'general'>;
  signals: Array<{ label: string; pattern: RegExp }>;
}

const ROUTE_RULES: RouteRule[] = [
  {
    reason: 'knowledge_base',
    signals: [
      { label: '知识库', pattern: /知识库|知识库检索|RAG|检索|引用来源/i },
      { label: 'Guardian规则', pattern: /Guardian规则|guardian rule|平台规则|告警规则/i },
      { label: '历史案例', pattern: /历史案例|历史事件|复盘|historical case/i },
      { label: '应急预案', pattern: /应急预案|应急响应|疏散方案|救援方案|emergency plan/i },
    ],
  },
  {
    reason: 'disaster_domain',
    signals: [
      {
        label: '灾害类型',
        pattern: /地震|火山|洪水|洪涝|风暴|台风|飓风|野火|森林火灾|火灾|干旱|海啸|滑坡|泥石流|雷暴|极端天气|earthquake|volcano|flood|storm|wildfire|drought|tsunami/i,
      },
      { label: '灾害研判', pattern: /灾害|灾情|风险评估|风险分析|灾害趋势|预警|次生灾害|减灾|抗灾/i },
    ],
  },
  {
    reason: 'live_context',
    signals: [
      { label: '实时监控', pattern: /实时|当前|平台数据|监控数据|活跃事件|态势|数据快照|现在有多少/i },
    ],
  },
];

function latestUserContent(messages: unknown): string {
  if (!Array.isArray(messages)) return '';

  const latestUser = [...messages].reverse().find((message): message is ChatMessage => (
    Boolean(message) &&
    typeof message === 'object' &&
    (message as Record<string, unknown>).role === 'user' &&
    typeof (message as Record<string, unknown>).content === 'string'
  ));

  return latestUser?.content.trim() ?? '';
}

export function routeAIRequest(
  messages?: unknown,
  disasterContext?: DisasterContext | null,
): AIRouteDecision {
  const content = latestUserContent(messages);

  for (const rule of ROUTE_RULES) {
    const matchedSignals = rule.signals
      .filter(signal => signal.pattern.test(content))
      .map(signal => signal.label);

    if (matchedSignals.length > 0) {
      return {
        target: 'workflow',
        reason: rule.reason,
        matchedSignals,
      };
    }
  }

  if (disasterContext && Number(disasterContext.total) > 0 && /分析|总结|概况|报告|评估|研判|趋势|风险/i.test(content)) {
    return {
      target: 'workflow',
      reason: 'live_context',
      matchedSignals: ['实时灾害上下文'],
    };
  }

  return {
    target: 'volcengine',
    reason: 'general',
    matchedSignals: [],
  };
}
