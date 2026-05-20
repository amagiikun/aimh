export function loadScriptPrompt(params: {
  style: string;
  description: string;
  characters: { name: string; description: string; traits: string[] }[];
  chapterCount: number;
  panelPerChapter: number;
}): string {
  const characterDesc = params.characters
    .map(
      (c) =>
        `- ${c.name}: ${c.description} (特质: ${c.traits.join(", ") || "无"})`,
    )
    .join("\n");

  return `你是一位专业的漫画编剧和分镜师。请根据以下项目信息，创作一部完整的漫画脚本与分镜。

## 项目信息

- 漫画风格: ${params.style}
- 故事描述: ${params.description}
- 章节数量: ${params.chapterCount}
- 每章分镜数量: ${params.panelPerChapter}

## 角色设定

${characterDesc || "（无预设角色，请自行创建）"}

## 输出要求

请严格按照以下 JSON 格式输出完整的漫画脚本和分镜。**只输出 JSON，不要包含任何其他文字、注释或 Markdown 包裹。** 确保输出是有效的 JSON 格式。

\`\`\`json
{
  "chapters": [
    {
      "title": "章节标题",
      "summary": "章节概要",
      "panels": [
        {
          "sceneNumber": 1,
          "panelNumber": 1,
          "description": "画面描述：详细描述该格画面中的人物、场景、构图、视角等",
          "dialogue": "角色对话内容",
          "narration": "旁白文字",
          "characters": ["角色名称"],
          "emotion": "该格主要情绪",
          "action": "角色动作描述"
        }
      ]
    }
  ]
}
\`\`\`

每个分镜需要包含：
- sceneNumber: 场景编号（同一场景编号相同）
- panelNumber: 分镜编号（按1递增）
- description: 详细的画面描述（构图、视角、人物位置、场景细节等）
- dialogue: 角色对话（无对话则为空字符串）
- narration: 旁白文字（无旁白则为空字符串）
- characters: 出场角色名称数组
- emotion: 该格的情绪标签（如：紧张、温馨、悬疑、欢乐等）
- action: 角色动作描述

生成 ${params.chapterCount} 个章节，每章 ${params.panelPerChapter} 个分镜。
确保故事有完整的起承转合，章节之间有合理的叙事节奏。`;
}

export function loadCharactersPrompt(params: {
  style: string;
  description: string;
  count: number;
}): string {
  return `你是一位专业的漫画角色设计师。请根据以下项目信息，设计 ${params.count} 个原创漫画角色。

## 项目信息

- 漫画风格: ${params.style}
- 故事描述: ${params.description}

## 输出要求

请严格按照以下 JSON 格式输出角色设定。**只输出 JSON，不要包含任何其他文字或 Markdown 包裹。**

\`\`\`json
{
  "characters": [
    {
      "name": "角色姓名",
      "description": "角色详细描述（外貌、性格、背景故事等）",
      "traits": ["特质标签1", "特质标签2"]
    }
  ]
}
\`\`\`

每个角色需要：
- name: 角色姓名
- description: 详细的角色描述（外貌特征、性格特点、背景故事等）
- traits: 3-5 个特质标签

请确保角色之间有明显的区分度，覆盖故事所需的主要角色类型（主角、配角、反派等）。`;
}
