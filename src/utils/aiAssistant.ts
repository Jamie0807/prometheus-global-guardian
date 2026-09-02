export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export const QUICK_PROMPTS = [
  {
    label: "🌍 全球态势综合分析",
    text: "请对当前全球灾害态势进行综合分析，包括风险分级和优先行动建议。",
  },
  { label: "🌊 洪水风险研判", text: "请分析当前全球洪水风险，重点区域和应急响应建议是什么？" },
  { label: "🌋 地震活动评估", text: "请评估当前全球地震活动情况，哪些地区需要重点关注？" },
  { label: "🔥 野火威胁分析", text: "目前全球野火威胁情况如何？有哪些高危区域和防控措施？" },
  { label: "📈 近期趋势预测", text: "基于当前数据，未来 7 天全球主要灾害类型的趋势预测是什么？" },
  { label: "🚨 应急响应指南", text: "针对当前监控到的高危灾害，请给出具体的应急响应优先级清单。" },
] as const;
