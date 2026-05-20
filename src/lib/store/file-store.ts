import fs from "fs/promises";
import path from "path";
import type { Character, Chapter, ProjectMeta } from "@/types";

function getDataDir(): string {
  const envDir = process.env.COMICFORGE_DATA_DIR;
  if (envDir) {
    return path.resolve(envDir);
  }
  return path.resolve(process.cwd(), "data", "projects");
}

export class FileStore {
  private baseDir: string;

  constructor() {
    this.baseDir = getDataDir();
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  private projectDir(id: string): string {
    return path.join(this.baseDir, id);
  }

  private metaPath(id: string): string {
    return path.join(this.projectDir(id), "meta.json");
  }

  private charactersPath(id: string): string {
    return path.join(this.projectDir(id), "characters.json");
  }

  private chapterPath(projectId: string, chapterId: string): string {
    return path.join(this.projectDir(projectId), "chapters", `${chapterId}.json`);
  }

  // --- Project CRUD ---

  async listProjects(): Promise<
    { id: string; name: string; style: string; description: string; chapterCount: number; createdAt: string; updatedAt: string }[]
  > {
    await this.ensureDir(this.baseDir);
    const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
    const projects: {
      id: string;
      name: string;
      style: string;
      description: string;
      chapterCount: number;
      createdAt: string;
      updatedAt: string;
    }[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const meta = await this.getMeta(entry.name);
        const chapters = await this.listChapters(entry.name);
        projects.push({
          id: entry.name,
          name: meta.name,
          style: meta.style,
          description: meta.description,
          chapterCount: chapters.length,
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
        });
      } catch {
        // Skip invalid project dirs
      }
    }

    projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return projects;
  }

  async getMeta(id: string): Promise<ProjectMeta> {
    const raw = await fs.readFile(this.metaPath(id), "utf-8");
    return JSON.parse(raw) as ProjectMeta;
  }

  async saveMeta(id: string, meta: ProjectMeta): Promise<void> {
    await this.ensureDir(this.projectDir(id));
    await fs.writeFile(this.metaPath(id), JSON.stringify(meta, null, 2), "utf-8");
  }

  async getCharacters(id: string): Promise<Character[]> {
    try {
      const raw = await fs.readFile(this.charactersPath(id), "utf-8");
      return JSON.parse(raw) as Character[];
    } catch {
      return [];
    }
  }

  async saveCharacters(id: string, characters: Character[]): Promise<void> {
    await this.ensureDir(this.projectDir(id));
    await fs.writeFile(this.charactersPath(id), JSON.stringify(characters, null, 2), "utf-8");
  }

  async deleteProject(id: string): Promise<void> {
    await fs.rm(this.projectDir(id), { recursive: true, force: true });
  }

  // --- Chapter CRUD ---

  async getChapter(projectId: string, chapterId: string): Promise<Chapter> {
    const raw = await fs.readFile(this.chapterPath(projectId, chapterId), "utf-8");
    return JSON.parse(raw) as Chapter;
  }

  async saveChapter(projectId: string, chapter: Chapter): Promise<void> {
    const dir = path.join(this.projectDir(projectId), "chapters");
    await this.ensureDir(dir);
    await fs.writeFile(
      path.join(dir, `${chapter.id}.json`),
      JSON.stringify(chapter, null, 2),
      "utf-8",
    );
  }

  async listChapters(projectId: string): Promise<string[]> {
    const dir = path.join(this.projectDir(projectId), "chapters");
    try {
      const files = await fs.readdir(dir);
      return files
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(/\.json$/, ""));
    } catch {
      return [];
    }
  }

  async deleteChapter(projectId: string, chapterId: string): Promise<void> {
    await fs.unlink(this.chapterPath(projectId, chapterId)).catch(() => {});
  }

  // --- Full project load ---

  async loadFullProject(id: string): Promise<{
    meta: ProjectMeta;
    characters: Character[];
    chapters: Chapter[];
  }> {
    const [meta, characters, chapterIds] = await Promise.all([
      this.getMeta(id),
      this.getCharacters(id),
      this.listChapters(id),
    ]);

    const chapters = await Promise.all(
      chapterIds.map((cid) => this.getChapter(id, cid)),
    );

    chapters.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return { meta, characters, chapters };
  }
}

export const fileStore = new FileStore();
