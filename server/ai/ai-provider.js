const DEFAULT_ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/plan/v3';
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

const firstValue = (...values) =>
  values.find(value => typeof value === 'string' && value.trim().length > 0)?.trim() ?? '';

export function resolveServerAIProviderConfig(env = process.env) {
  const providerName = firstValue(env.AI_PROVIDER, env.VOLCENGINE_AI_PROVIDER).toLowerCase() || 'ark';

  if (providerName === 'workflow') {
    const apiUrl = firstValue(
      env.VOLCENGINE_WORKFLOW_API_URL,
      env.AI_WORKFLOW_API_URL,
    );

    if (!apiUrl) {
      return {
        configured: false,
        reason: 'missing_workflow_url',
        providerName: 'workflow',
        apiKey: '',
        apiUrl: '',
        model: '',
        requestTimeoutMs: resolveAIRequestTimeoutMs(env),
      };
    }

    return {
      configured: true,
      reason: '',
      providerName: 'workflow',
      apiKey: firstValue(
        env.VOLCENGINE_WORKFLOW_API_KEY,
        env.AI_WORKFLOW_API_KEY,
      ),
      apiUrl,
      model: '',
      requestTimeoutMs: resolveAIRequestTimeoutMs(env),
    };
  }

  const apiKey = firstValue(
    env.VOLCENGINE_ARK_API_KEY,
    env.ARK_API_KEY,
  );

  if (!apiKey) {
    return {
      configured: false,
      reason: 'missing_key',
      providerName: 'volcengine',
      apiKey: '',
      apiUrl: '',
      model: '',
      requestTimeoutMs: resolveAIRequestTimeoutMs(env),
    };
  }

  const model = firstValue(
    env.VOLCENGINE_ARK_MODEL,
    env.ARK_MODEL,
  );

  if (!model) {
    return {
      configured: false,
      reason: 'missing_model',
      providerName: 'volcengine',
      apiKey,
      apiUrl: firstValue(
        env.VOLCENGINE_ARK_API_URL,
        env.ARK_API_URL,
      ) || DEFAULT_ARK_API_URL,
      model: '',
      requestTimeoutMs: resolveAIRequestTimeoutMs(env),
    };
  }

  return {
    configured: true,
    reason: '',
    providerName: 'volcengine',
    apiKey,
    apiUrl: firstValue(
      env.VOLCENGINE_ARK_API_URL,
      env.ARK_API_URL,
    ) || DEFAULT_ARK_API_URL,
    model,
    requestTimeoutMs: resolveAIRequestTimeoutMs(env),
  };
}

export function normalizeAIProviderApiUrl(apiUrl = DEFAULT_ARK_API_URL) {
  const trimmedUrl = firstValue(apiUrl) || DEFAULT_ARK_API_URL;
  const normalizedUrl = trimmedUrl.replace(/\/+$/, '');
  const lowerUrl = normalizedUrl.toLowerCase();

  if (lowerUrl.endsWith('/responses')) {
    return {
      apiUrl: normalizedUrl,
      protocol: 'responses',
    };
  }

  if (lowerUrl.endsWith('/chat/completions')) {
    return {
      apiUrl: normalizedUrl,
      protocol: 'chat_completions',
    };
  }

  if (lowerUrl.includes('/api/plan/v3')) {
    return {
      apiUrl: `${normalizedUrl}/responses`,
      protocol: 'responses',
    };
  }

  return {
    apiUrl: normalizedUrl,
    protocol: 'chat_completions',
  };
}

export function resolveAIRequestTimeoutMs(env = process.env) {
  const rawValue = firstValue(
    env.VOLCENGINE_ARK_TIMEOUT_MS,
    env.ARK_TIMEOUT_MS,
  );
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  return Math.min(parsed, 120_000);
}

export function buildDisasterSystemPrompt(ctx) {
  let prompt = `你是 Prometheus Global Guardian 平台的 AI 灾害分析助手（Powered by LLM）。
你的专业领域：全球灾害监控、风险评估、应急响应分析与减灾策略。

职责范围：
• 解读平台实时灾害监控数据，提供专业态势研判
• 对地震、火山、洪水、风暴、野火、干旱、海啸等灾害进行深度分析
• 基于历史数据与当前态势，研判灾害发展趋势
• 提供具体、可操作的应急响应建议与减灾策略
• 解答灾害科学相关专业问题

输出规范：使用结构化 Markdown 格式（标题、要点列表），语言简洁专业，关键数据加粗。`;

  if (ctx && Number(ctx.total) > 0) {
    const topTypes = Object.entries(ctx.byType ?? {})
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .slice(0, 6)
      .map(([type, count]) => `${type}(${count})`)
      .join('、');

    const recentStr = Array.isArray(ctx.recent)
      ? ctx.recent
          .slice(0, 4)
          .map(hazard => {
            const severity = hazard.severity ? ` ${hazard.severity}` : '';
            const magnitude = hazard.magnitude ? ` M${hazard.magnitude}` : '';
            return `「${hazard.title}」${hazard.type}${severity}${magnitude}`;
          })
          .join('；')
      : '';

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

export function buildChatCompletionPayload({ messages, disasterContext, model }) {
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter(message => ['user', 'assistant'].includes(message?.role) && typeof message?.content === 'string')
        .map(message => ({ role: message.role, content: message.content }))
    : [];

  return {
    model,
    stream: true,
    temperature: 0.7,
    max_tokens: 1500,
    messages: [
      { role: 'system', content: buildDisasterSystemPrompt(disasterContext) },
      ...safeMessages,
    ],
  };
}

export function buildResponsesPayload({ messages, disasterContext, model }) {
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter(message => ['user', 'assistant'].includes(message?.role) && typeof message?.content === 'string')
        .map(message => ({ role: message.role, content: message.content }))
    : [];

  return {
    model,
    stream: true,
    temperature: 0.7,
    max_output_tokens: 1500,
    instructions: buildDisasterSystemPrompt(disasterContext),
    input: safeMessages,
  };
}

export function buildWorkflowPayload({ messages, disasterContext }) {
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter(message => ['user', 'assistant'].includes(message?.role) && typeof message?.content === 'string')
        .map(message => `${message.role === 'assistant' ? '助手' : '用户'}：${message.content}`)
    : [];

  return {
    inputs: {
      user_input: [
        buildDisasterSystemPrompt(disasterContext),
        '',
        '对话内容：',
        ...safeMessages,
      ].join('\n'),
    },
  };
}

export function buildAIProviderRequest({ config, messages, disasterContext }) {
  if (config.providerName === 'workflow') {
    return {
      apiUrl: config.apiUrl.replace(/\/+$/, ''),
      protocol: 'workflow',
      headers: {
        stream: 'true',
      },
      payload: buildWorkflowPayload({ messages, disasterContext }),
    };
  }

  const target = normalizeAIProviderApiUrl(config.apiUrl);

  return {
    ...target,
    payload:
      target.protocol === 'responses'
        ? buildResponsesPayload({ messages, disasterContext, model: config.model })
        : buildChatCompletionPayload({ messages, disasterContext, model: config.model }),
  };
}
