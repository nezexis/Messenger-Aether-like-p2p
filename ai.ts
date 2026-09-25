export interface AIMessage {
  role: 'user' | 'model';
  text: string;
  sources?: string[];
  searchQueries?: string[];
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, delay = 1200): Promise<Response> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err: any) {
      lastError = err;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export const aiService = {
  async chat(
    messages: AIMessage[],
    options?: { enableSearch?: boolean; enableMaps?: boolean; systemInstruction?: string }
  ): Promise<{ text: string; sources?: string[]; searchQueries?: string[] }> {
    let res: Response;
    try {
      res = await fetchWithRetry(
        '/api/gemini/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            enableSearch: options?.enableSearch ?? false,
            enableMaps: options?.enableMaps ?? false,
            systemInstruction: options?.systemInstruction,
          }),
        },
        2,
        1000
      );
    } catch (networkError: any) {
      throw new Error(
        'Связь с сервером AI временно прервалась (перезапуск или тайм-аут сети). Пожалуйста, повторите отправку.'
      );
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'AI server request failed' }));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }

    return res.json();
  },

  async transcribe(audioBase64: string, mimeType = 'audio/webm'): Promise<string> {
    let res: Response;
    try {
      res = await fetchWithRetry(
        '/api/gemini/transcribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mimeType,
          }),
        },
        2,
        1000
      );
    } catch (networkError: any) {
      throw new Error('Не удалось отправить голосовое сообщение на распознавание. Проверьте соединение.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Transcription failed' }));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    return data.transcription || '';
  },
};
