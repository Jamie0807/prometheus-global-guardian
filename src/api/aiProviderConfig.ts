type EnvValue = string | undefined;

export interface AIProviderConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  providerName: 'volcengine' | 'openai-compatible' | 'demo';
  missingModel: boolean;
}

interface AIProviderEnv {
  VITE_VOLCENGINE_ARK_API_KEY?: EnvValue;
  VITE_VOLCENGINE_ARK_API_URL?: EnvValue;
  VITE_VOLCENGINE_ARK_MODEL?: EnvValue;
  VITE_ARK_API_KEY?: EnvValue;
  VITE_ARK_API_URL?: EnvValue;
  VITE_ARK_MODEL?: EnvValue;
  VITE_OPENAI_API_KEY?: EnvValue;
  VITE_OPENAI_API_URL?: EnvValue;
  VITE_OPENAI_MODEL?: EnvValue;
}

const DEFAULT_ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DEFAULT_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo';

const firstValue = (...values: EnvValue[]) => values.find(value => value && value.trim().length > 0)?.trim() ?? '';

export function resolveAIProviderConfig(env: AIProviderEnv): AIProviderConfig {
  const arkApiKey = firstValue(env.VITE_VOLCENGINE_ARK_API_KEY, env.VITE_ARK_API_KEY);

  if (arkApiKey) {
    const model = firstValue(env.VITE_VOLCENGINE_ARK_MODEL, env.VITE_ARK_MODEL);
    return {
      apiKey: arkApiKey,
      apiUrl: firstValue(env.VITE_VOLCENGINE_ARK_API_URL, env.VITE_ARK_API_URL) || DEFAULT_ARK_API_URL,
      model,
      providerName: 'volcengine',
      missingModel: !model,
    };
  }

  const openAIKey = firstValue(env.VITE_OPENAI_API_KEY);
  if (openAIKey) {
    return {
      apiKey: openAIKey,
      apiUrl: firstValue(env.VITE_OPENAI_API_URL) || DEFAULT_OPENAI_API_URL,
      model: firstValue(env.VITE_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
      providerName: 'openai-compatible',
      missingModel: false,
    };
  }

  return {
    apiKey: '',
    apiUrl: '',
    model: '',
    providerName: 'demo',
    missingModel: false,
  };
}
