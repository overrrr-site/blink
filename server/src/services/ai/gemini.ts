export interface GeminiTextOptions {
  prompt: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  thinkingBudget?: number;
}

export interface GeminiVisionOptions {
  prompt: string;
  model: string;
  base64Data: string;
  mimeType: string;
  maxOutputTokens: number;
  temperature: number;
}

export function extractGeminiText(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const candidatesValue = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidatesValue) || candidatesValue.length === 0) {
    return '';
  }

  const firstCandidate = candidatesValue[0];
  if (!firstCandidate || typeof firstCandidate !== 'object') {
    return '';
  }

  const contentValue = (firstCandidate as { content?: unknown }).content;
  if (!contentValue || typeof contentValue !== 'object') {
    return '';
  }

  const partsValue = (contentValue as { parts?: unknown }).parts;
  if (!Array.isArray(partsValue) || partsValue.length === 0) {
    return '';
  }

  const firstPart = partsValue[0];
  if (!firstPart || typeof firstPart !== 'object') {
    return '';
  }

  const textValue = (firstPart as { text?: unknown }).text;
  return typeof textValue === 'string' ? textValue : '';
}

export async function callGeminiText(options: GeminiTextOptions): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: options.prompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxOutputTokens,
          temperature: options.temperature,
          ...(options.thinkingBudget !== undefined
            ? { thinkingConfig: { thinkingBudget: options.thinkingBudget } }
            : {}),
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const text = extractGeminiText(data);
  return text || null;
}

export async function callGeminiVision(options: GeminiVisionOptions): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: options.mimeType, data: options.base64Data } },
            { text: options.prompt },
          ],
        }],
        generationConfig: {
          maxOutputTokens: options.maxOutputTokens,
          temperature: options.temperature,
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const text = extractGeminiText(data);
  return text || null;
}

// Base64データを処理してMIMEタイプを検出
export function processBase64Image(base64Input: string): { base64Data: string; mimeType: string } {
  let base64Data = base64Input.includes(',')
    ? base64Input.split(',')[1]
    : base64Input;

  let mimeType = 'image/jpeg';
  if (base64Input.includes('data:image/')) {
    const match = base64Input.match(/data:image\/([^;]+)/);
    if (match) {
      const ext = match[1];
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'webp') mimeType = 'image/webp';
    }
  }

  return { base64Data, mimeType };
}
