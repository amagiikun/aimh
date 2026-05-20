import { NextRequest } from "next/server";
import { fileStore } from "@/lib/store/file-store";
import { createAiProvider, callWithRetry } from "@/lib/ai/provider";
import { loadScriptPrompt } from "@/lib/prompts/template";
import { generateId, hashRequest } from "@/lib/utils";
import type { Chapter, Character, ProjectMeta, Panel } from "@/types";

const resultCache = new Map<string, string>();

function parseJsonFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) return jsonMatch[1].trim();
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1) {
    return text.slice(braceStart, braceEnd + 1);
  }
  return text.trim();
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const body = await request.json();
        const {
          modelProvider,
          modelName,
          baseUrl,
          apiKey,
          chapterCount = 3,
          panelPerChapter = 6,
        } = body;

        if (!modelProvider || !modelName || !baseUrl || !apiKey) {
          sendEvent(JSON.stringify({ type: "error", data: { message: "缺少 AI 配置参数" } }));
          controller.close();
          return;
        }

        // Load project data
        let meta: ProjectMeta;
        let characters: Character[];
        try {
          const data = await fileStore.loadFullProject(id);
          meta = data.meta;
          characters = data.characters;
        } catch {
          sendEvent(JSON.stringify({ type: "error", data: { message: "项目未找到" } }));
          controller.close();
          return;
        }

        // Build prompt
        const prompt = loadScriptPrompt({
          style: meta.style,
          description: meta.description,
          characters: characters.map((c) => ({
            name: c.name,
            description: c.description,
            traits: c.traits,
          })),
          chapterCount,
          panelPerChapter,
        });

        // Check cache
        const cacheKey = hashRequest({
          prompt,
          model: modelName,
          provider: modelProvider,
        });

        const cached = resultCache.get(cacheKey);
        let resultText: string;

        if (cached) {
          resultText = cached;
        } else {
          // Create AI provider
          const provider = await createAiProvider(modelProvider, {
            baseUrl,
            apiKey,
            model: modelName,
          });

          // Call with retry
          resultText = await callWithRetry(
            provider,
            [
              { role: "system", content: "你是一位专业的漫画编剧和分镜师。请严格按照要求输出 JSON 格式的完整漫画脚本。" },
              { role: "user", content: prompt },
            ],
            (chunk) => {
              // Send partial updates for typewriter effect
              sendEvent(JSON.stringify({
                type: "chunk",
                data: { text: chunk },
              }));
            },
            3,
          );

          // Cache result
          resultCache.set(cacheKey, resultText);
          // Limit cache size
          if (resultCache.size > 100) {
            const firstKey = resultCache.keys().next().value;
            if (firstKey) resultCache.delete(firstKey);
          }
        }

        // Parse result
        const jsonStr = parseJsonFromMarkdown(resultText);
        const parsed = safeJsonParse(jsonStr);

        if (!parsed) {
          sendEvent(JSON.stringify({
            type: "error",
            data: { message: "AI 返回格式无效，请重试", raw: resultText.slice(0, 500) },
          }));
          controller.close();
          return;
        }

        // Process chapters
        const chaptersData = (parsed.chapters as Array<{
          title?: string;
          summary?: string;
          panels?: Array<{
            sceneNumber?: number;
            panelNumber?: number;
            description?: string;
            dialogue?: string;
            narration?: string;
            characters?: string[];
            emotion?: string;
            action?: string;
          }>;
        }>) || [];

        const savedChapters: Chapter[] = [];

        for (let i = 0; i < chaptersData.length; i++) {
          const ch = chaptersData[i];
          const chapterId = generateId();
          const now = new Date().toISOString();

          const panels: Panel[] = (ch.panels || []).map((p) => ({
            id: generateId(),
            sceneNumber: p.sceneNumber || 1,
            panelNumber: p.panelNumber || 1,
            description: p.description || "",
            dialogue: p.dialogue || "",
            narration: p.narration || "",
            characters: p.characters || [],
            emotion: p.emotion,
            action: p.action,
          }));

          const chapter: Chapter = {
            id: chapterId,
            title: ch.title || `第 ${i + 1} 章`,
            summary: ch.summary || "",
            panels,
            createdAt: now,
          };

          await fileStore.saveChapter(id, chapter);
          savedChapters.push(chapter);
        }

        // Send chapter data to client
        for (const chapter of savedChapters) {
          sendEvent(JSON.stringify({
            type: "chapter",
            data: chapter,
          }));
        }

        // Update project timestamp
        await fileStore.saveMeta(id, {
          ...meta,
          updatedAt: new Date().toISOString(),
        });

        sendEvent(JSON.stringify({ type: "done", data: { chapters: savedChapters } }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "生成失败";
        sendEvent(JSON.stringify({ type: "error", data: { message } }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
