import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Enable CORS & Preflight handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI with environment key
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// API Route: Multi-turn Chat with optional Google Search Grounding and automatic fallback
app.post('/api/gemini/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const { messages, systemInstruction, enableSearch } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    // Format contents for @google/genai
    const contents = messages.map((m: any) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text || m.content || '' }],
    }));

    const baseInstruction =
      systemInstruction ||
      'You are Aether AI, a brilliant, helpful, friendly assistant integrated inside the Aether P2P Messenger. Respond cleanly in markdown. Provide helpful, accurate, concise answers.';

    let response: any = null;

    // Tier 1: Try gemini-flash-latest with Google Search Grounding if requested
    if (enableSearch) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents,
          config: {
            systemInstruction: baseInstruction,
            tools: [{ googleSearch: {} }],
          },
        });
      } catch {
        // Search grounding unavailable or rate-limited on current API key, seamlessly proceed to direct response
        response = null;
      }
    }

    // Tier 2: Try standard gemini-flash-latest without search tool
    if (!response) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents,
          config: {
            systemInstruction: baseInstruction,
          },
        });
      } catch {
        // Fall back to high-throughput flash-lite
        response = null;
      }
    }

    // Tier 3: Try gemini-3.1-flash-lite (high RPM & separate rate limit)
    if (!response) {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction: baseInstruction,
        },
      });
    }

    const candidate = response?.candidates?.[0];
    const text = response?.text || '';
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
    const searchQueries = candidate?.groundingMetadata?.webSearchQueries || [];

    const sources = groundingChunks
      .map((c: any) => c.web?.title || c.web?.uri)
      .filter(Boolean);

    res.json({
      text,
      sources,
      searchQueries,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);

    let errorMsg = error?.message || 'Не удалось получить ответ от нейросети.';
    try {
      const parsed = typeof errorMsg === 'string' && errorMsg.startsWith('{') ? JSON.parse(errorMsg) : null;
      if (parsed?.error?.message) {
        errorMsg = parsed.error.message;
      }
    } catch {}

    const isQuotaExceeded =
      error?.status === 429 ||
      errorMsg.includes('quota') ||
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.includes('rate-limit');

    if (isQuotaExceeded) {
      res.status(429).json({
        error: 'Лимит бесплатных запросов к Gemini временно исчерпан. Пожалуйста, подождите 20-30 секунд перед следующим сообщением.',
      });
      return;
    }

    res.status(500).json({
      error: errorMsg,
    });
  }
});

// API Route: Audio Transcription with Gemini
app.post('/api/gemini/transcribe', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 data is required.' });
      return;
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: cleanBase64,
              },
            },
            {
              text: 'Transcribe this voice message accurately into text. If spoken in Russian or English, write the transcription in that language. Output ONLY the transcribed text without extra preamble.',
            },
          ],
        },
      ],
    });

    res.json({
      transcription: response.text || '',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/transcribe:', error);
    res.status(500).json({
      error: error?.message || 'Failed to transcribe audio.',
    });
  }
});

// Setup Vite middleware in Dev or serve Static in Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), HOST, () => {
    console.log(`Server listening on port ${PORT} host ${HOST}`);
  });
}

startServer();
