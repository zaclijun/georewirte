/**
 * Model Provider 预设
 *
 * 为模型配置面板提供常见 OpenAI-Compatible 服务商的预设值，
 * 选择 provider 后自动填充默认 base_url、推荐 model_id、
 * API Key 占位符与文档链接。
 *
 * 添加新 provider 时只需向 MODEL_PROVIDERS 追加一项。
 */

export interface ModelProviderPreset {
  provider: string
  label: string
  defaultBaseUrl: string
  defaultModelId: string
  modelIdExamples: string[]
  apiKeyRequired: boolean
  apiKeyPlaceholder?: string
  docsUrl?: string
}

export const MODEL_PROVIDERS: ModelProviderPreset[] = [
  {
    provider: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModelId: 'gpt-4o-mini',
    modelIdExamples: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'o1-mini'],
    apiKeyRequired: true,
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    provider: 'deepseek',
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModelId: 'deepseek-chat',
    modelIdExamples: ['deepseek-chat', 'deepseek-reasoner'],
    apiKeyRequired: true,
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com',
  },
  {
    provider: 'qwen',
    label: '阿里云百炼 / 通义千问',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModelId: 'qwen-plus',
    modelIdExamples: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen2.5-72b-instruct'],
    apiKeyRequired: true,
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://bailian.console.aliyun.com',
  },
  {
    provider: 'moonshot',
    label: 'Moonshot / Kimi',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModelId: 'moonshot-v1-8k',
    modelIdExamples: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-latest'],
    apiKeyRequired: true,
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.moonshot.cn',
  },
  {
    provider: 'volcengine',
    label: '火山方舟 / 豆包',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModelId: '',
    modelIdExamples: ['doubao-pro-32k', 'doubao-pro-128k', 'ep-xxxxxxxx'],
    apiKeyRequired: true,
    apiKeyPlaceholder: '火山方舟 API Key',
    docsUrl: 'https://console.volcengine.com/ark',
  },
  {
    provider: 'openrouter',
    label: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModelId: '',
    modelIdExamples: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5'],
    apiKeyRequired: true,
    apiKeyPlaceholder: 'sk-or-...',
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    provider: 'ollama',
    label: 'Ollama / 本地模型',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModelId: 'llama3',
    modelIdExamples: ['llama3', 'qwen2.5', 'deepseek-r1', 'phi3'],
    apiKeyRequired: false,
    apiKeyPlaceholder: 'ollama（可留空）',
    docsUrl: 'https://ollama.com',
  },
  {
    provider: 'custom',
    label: '自定义 OpenAI-Compatible',
    defaultBaseUrl: '',
    defaultModelId: '',
    modelIdExamples: [],
    apiKeyRequired: true,
    apiKeyPlaceholder: 'API Key',
  },
]

export function getProviderPreset(provider: string): ModelProviderPreset | undefined {
  return MODEL_PROVIDERS.find((p) => p.provider === provider)
}
