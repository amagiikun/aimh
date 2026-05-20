export interface Character {
  id: string;
  name: string;
  description: string;
  traits: string[];
  createdAt: string;
}

export interface Panel {
  id: string;
  sceneNumber: number;
  panelNumber: number;
  description: string;
  dialogue: string;
  narration: string;
  characters: string[];
  emotion?: string;
  action?: string;
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  panels: Panel[];
  createdAt: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  style: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  style: string;
  description: string;
  characters: Character[];
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiConfig {
  id: string;
  name: string;
  provider: ApiProvider;
  baseUrl: string;
  apiKey: string;
  models: string[];
  selectedModel: string;
}

export type ApiProvider = "openai" | "claude" | "gemini";

export interface GenerateRequest {
  projectId: string;
  modelProvider: ApiProvider;
  modelName: string;
  baseUrl: string;
  apiKey: string;
  chapterCount: number;
  panelPerChapter: number;
}

export interface GenerateChunk {
  type: "meta" | "chapter" | "panel" | "character" | "done" | "error";
  data: unknown;
}

export interface ProjectListItem {
  id: string;
  name: string;
  style: string;
  description: string;
  chapterCount: number;
  createdAt: string;
  updatedAt: string;
}
