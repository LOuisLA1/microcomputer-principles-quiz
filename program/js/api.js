// js/api.js — 硅基流动 API 封装

export class APIError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getSettings() {
  const stored = localStorage.getItem('literature_screener_settings');
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* ignore */ }
  }
  return {
    apiKey: '',
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3.2',
  };
}

export async function chatCompletion(messages, options = {}) {
  const settings = getSettings();
  if (!settings.apiKey) throw new APIError(0, '请先在设置中配置 API Key');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const response = await fetch(`${settings.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? 0.1,
        ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status === 401) throw new APIError(401, 'API Key 无效，请检查设置');
    if (response.status === 429) throw new APIError(429, '请求过于频繁，请稍后重试');
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new APIError(response.status, `API 请求失败 (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new APIError(0, '请求超时');
    if (err instanceof APIError) throw err;
    throw new APIError(0, `网络错误: ${err.message}`);
  }
}

export async function testConnection(customSettings) {
  try {
    const data = await chatCompletion(
      [{ role: 'user', content: '你好，请回复"连接成功"' }],
      { maxTokens: 50, temperature: 0 }
    );
    return !!(data.choices && data.choices.length > 0);
  } catch (err) {
    return false;
  }
}

export async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      if (err.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      } else if (err.status === 401 || err.status === 400) {
        throw err;
      } else {
        await sleep(baseDelay * Math.pow(2, attempt));
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
