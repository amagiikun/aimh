export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AiProvider {
  chat(
    messages: AiMessage[],
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string>;
}

export async function createAiProvider(
  type: "openai" | "claude" | "gemini",
  config: AiProviderConfig,
): Promise<AiProvider> {
  switch (type) {
    case "openai":
      return new OpenAIProvider(config);
    case "claude":
      return new ClaudeProvider(config);
    case "gemini":
      return new GeminiProvider(config);
    default:
      throw new Error(`Unsupported provider type: ${type}`);
  }
}

class OpenAIProvider implements AiProvider {
  private config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    this.config = config;
  }

  async chat(
    messages: AiMessage[],
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const body = JSON.stringify({
      model: this.config.model,
      messages,
      stream: true,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body,
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content) {
            full += content;
            onChunk(content);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    return full;
  }
}

class ClaudeProvider implements AiProvider {
  private config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    this.config = config;
  }

  async chat(
    messages: AiMessage[],
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/messages`;
    const systemMsg = messages.find((m) => m.role === "system");
    const otherMessages = messages.filter((m) => m.role !== "system");

    const body = JSON.stringify({
      model: this.config.model,
      system: systemMsg?.content,
      messages: otherMessages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      stream: true,
      max_tokens: 4096,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body,
      signal,
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const content =
            parsed.type === "content_block_delta"
              ? parsed.delta?.text || ""
              : "";
          if (content) {
            full += content;
            onChunk(content);
          }
        } catch {
          // Skip
        }
      }
    }

    return full;
  }
}

class GeminiProvider implements AiProvider {
  private config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    this.config = config;
  }

  async chat(
    messages: AiMessage[],
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const url = `${baseUrl}/models/${this.config.model}:streamGenerateContent?alt=sse`;

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === "system");

    const body: Record<string, unknown> = {
      contents,
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction.content }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.config.apiKey,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          const text =
            parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text) {
            full += text;
            onChunk(text);
          }
        } catch {
          // Skip
        }
      }
    }

    return full;
  }
}

export async function callWithRetry(
  provider: AiProvider,
  messages: AiMessage[],
  onChunk: (text: string) => void,
  retries: number = 3,
  signal?: AbortSignal,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await provider.chat(messages, onChunk, signal);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (signal?.aborted) throw lastError;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export async function listModels(
  type: "openai" | "claude" | "gemini",
  baseUrl: string,
  apiKey: string,
): Promise<string[]> {
  const base = baseUrl.replace(/\/$/, "");

  if (type === "openai") {
    const url = `${base}/models`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Failed to list models: ${res.status}`);
    const data = await res.json();
    return (data.data || []).map((m: { id: string }) => m.id);
  }

  if (type === "claude") {
    const url = `${base}/models`;
    const res = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!res.ok) throw new Error(`Failed to list models: ${res.status}`);
    const data = await res.json();
    return (data.data || []).map((m: { id: string }) => m.id);
  }

  if (type === "gemini") {
    const url = `${base}/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to list models: ${res.status}`);
    const data = await res.json();
    return (data.models || [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((m: { name: string }) => m.name.replace("models/", ""));
  }

  return [];
}
