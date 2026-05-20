"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Label, Select, Skeleton,
} from "@/components/ui";
import PanelCard from "@/components/panel-card";
import type { Project, Chapter, ApiConfig } from "@/types";

// Character name mapping helper
function buildCharNameMap(chapters: Chapter[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const ch of chapters) {
    for (const p of ch.panels) {
      for (const c of p.characters) {
        if (!map[c]) map[c] = c;
      }
    }
  }
  return map;
}

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [chapterCount, setChapterCount] = useState(3);
  const [panelPerChapter, setPanelPerChapter] = useState(6);
  const [genLog, setGenLog] = useState<string[]>([]);
  const genLogRef = useRef<string[]>([]);

  // Characters tab
  const [charName, setCharName] = useState("");
  const [charDesc, setCharDesc] = useState("");
  const [charTraits, setCharTraits] = useState("");

  // API config selection
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ApiConfig | null>(null);

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        if (data.chapters?.length > 0) {
          setActiveChapter(data.chapters[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load project", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const checkAuth = useCallback(async () => {
    const envCheck = await fetch("/api/auth").then((r) => r.json());
    if (envCheck.required) {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
    }
    setAuthChecked(true);
  }, [projectId, router]);

  const loadApiConfigs = useCallback(() => {
    try {
      const stored = localStorage.getItem("comicforge_api_configs");
      if (stored) {
        const configs = JSON.parse(stored) as ApiConfig[];
        setApiConfigs(configs);
        if (configs.length > 0) {
          setSelectedConfig(configs[0]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    checkAuth();
    loadProject();
    loadApiConfigs();
  }, [checkAuth, loadProject, loadApiConfigs]);

  const addLog = useCallback((msg: string) => {
    genLogRef.current = [...genLogRef.current, msg];
    setGenLog([...genLogRef.current]);
  }, []);

  // ---- Generation ----
  async function handleGenerate() {
    if (!selectedConfig) {
      alert("请先在设置页配置 API");
      return;
    }

    setGenerating(true);
    setGenLog([]);
    genLogRef.current = [];
    addLog("正在连接 AI 服务...");

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelProvider: selectedConfig.provider || "openai",
          modelName: selectedConfig.selectedModel,
          baseUrl: selectedConfig.baseUrl,
          apiKey: selectedConfig.apiKey,
          chapterCount,
          panelPerChapter,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        addLog(`错误: ${err}`);
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        addLog("错误: 无响应数据");
        setGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "chunk") {
              // Typewriter effect - append to last log
              const lastMsg = genLogRef.current[genLogRef.current.length - 1] || "";
              if (lastMsg.startsWith("生成中")) {
                genLogRef.current[genLogRef.current.length - 1] = "生成中: " + parsed.data.text.slice(0, 60) + "...";
              } else {
                genLogRef.current.push("生成中: " + parsed.data.text.slice(0, 60) + "...");
              }
              setGenLog([...genLogRef.current]);
            } else if (parsed.type === "chapter") {
              addLog(`章节完成: "${parsed.data.title}" (${parsed.data.panels.length} 个分镜)`);
            } else if (parsed.type === "done") {
              addLog(`生成完成! 共 ${parsed.data.chapters.length} 章`);
              // Reload project data
              await loadProject();
            } else if (parsed.type === "error") {
              addLog(`错误: ${parsed.data.message}`);
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      addLog(`网络错误: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGenerating(false);
    }
  }

  // ---- Character management ----
  async function handleAddCharacter() {
    if (!charName.trim()) return;

    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: charName.trim(),
        description: charDesc.trim(),
        traits: charTraits.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });

    if (res.ok) {
      setCharName("");
      setCharDesc("");
      setCharTraits("");
      loadProject();
    }
  }

  async function handleDeleteCharacter(characterId: string) {
    if (!confirm("确定删除此角色？")) return;
    await fetch(`/api/characters?projectId=${projectId}&characterId=${characterId}`, {
      method: "DELETE",
    });
    loadProject();
  }

  // ---- Export ----
  async function handleExportJSON() {
    if (!project) return;
    const exportData = {
      name: project.name,
      style: project.style,
      description: project.description,
      characters: project.characters,
      chapters: project.chapters.map((ch) => ({
        title: ch.title,
        summary: ch.summary,
        panels: ch.panels,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportMarkdown() {
    if (!project) return;
    let md = `# ${project.name}\n\n`;
    md += `**风格**: ${project.style}\n\n`;
    md += `**简介**: ${project.description}\n\n`;

    if (project.characters.length > 0) {
      md += `## 角色\n\n`;
      for (const c of project.characters) {
        md += `- **${c.name}**: ${c.description} (${c.traits.join(", ")})\n`;
      }
      md += "\n";
    }

    for (const ch of project.chapters) {
      md += `## ${ch.title}\n\n`;
      if (ch.summary) md += `${ch.summary}\n\n`;

      for (const p of ch.panels) {
        md += `### S${p.sceneNumber}P${p.panelNumber}\n\n`;
        md += `${p.description}\n\n`;
        if (p.narration) md += `> ${p.narration}\n\n`;
        if (p.dialogue) md += `**对话**: "${p.dialogue}"\n\n`;
        if (p.action) md += `*${p.action}*\n\n`;
        md += `---\n\n`;
      }
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}-export.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">项目未找到</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
          返回
        </Button>
      </div>
    );
  }

  const activeChapterData = project.chapters.find((c) => c.id === activeChapter);
  const charNameMap = buildCharNameMap(project.chapters);

  // Also build name map from project characters
  for (const c of project.characters) {
    charNameMap[c.id] = c.name;
  }

  return (
    <div>
      <header className="mb-6 border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              &larr; 返回
            </Button>
            <div>
              <h1 className="text-xl font-serif font-bold text-foreground">{project.name}</h1>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">{project.style}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              导出 JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
              导出 Markdown
            </Button>
          </div>
        </div>
        {project.description && (
          <p className="mt-3 text-sm text-muted-foreground font-serif leading-relaxed bg-muted/20 p-3 border border-border/50 rounded-sm italic">{project.description}</p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left sidebar - Chapters & Characters */}
        <div className="space-y-6 lg:col-span-1">
          {/* Generation controls */}
          <Card>
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-3">
              <CardTitle className="text-sm font-serif font-bold text-foreground">AI 生成 SCRIPT GENERATION</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-serif font-bold text-foreground">API 配置</Label>
                {apiConfigs.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-serif italic">
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-secondary font-sans font-medium" onClick={() => router.push("/settings")}>
                      前往设置 GO TO SETTINGS
                    </Button>
                    {" "}添加 API 配置
                  </p>
                ) : (
                  <Select
                    value={selectedConfig?.id || ""}
                    onChange={(e) => {
                      const cfg = apiConfigs.find((c) => c.id === e.target.value);
                      if (cfg) setSelectedConfig(cfg);
                    }}
                  >
                    {apiConfigs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.selectedModel})
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-serif font-bold text-foreground">章节数</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={chapterCount}
                    onChange={(e) => setChapterCount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-serif font-bold text-foreground">每章分镜</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={panelPerChapter}
                    onChange={(e) => setPanelPerChapter(Number(e.target.value))}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                variant="secondary"
                onClick={handleGenerate}
                disabled={generating || !selectedConfig}
              >
                {generating ? "生成中..." : "生成脚本 GENERATE"}
              </Button>

              {genLog.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-sm border border-border/80 bg-muted/30 p-2 font-mono text-[10px] leading-relaxed">
                  {genLog.map((msg, i) => (
                    <p key={i} className="text-muted-foreground">{msg}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Characters */}
          <Card>
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-3">
              <CardTitle className="text-sm font-serif font-bold text-foreground">角色库 CHARACTER CAST ({project.characters.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Input
                  placeholder="角色名"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  size={1}
                />
                <Input
                  placeholder="描述"
                  value={charDesc}
                  onChange={(e) => setCharDesc(e.target.value)}
                />
                <Input
                  placeholder="特质（逗号分隔）"
                  value={charTraits}
                  onChange={(e) => setCharTraits(e.target.value)}
                />
                <Button size="sm" variant="outline" className="w-full mt-1" onClick={handleAddCharacter} disabled={!charName.trim()}>
                  添加角色 ADD
                </Button>
              </div>

              {project.characters.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  {project.characters.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-sm border border-border/30 bg-muted/10 px-2 py-1.5 text-sm hover:bg-accent/5">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-serif font-bold text-foreground">{c.name}</span>
                        {c.traits.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.traits.slice(0, 3).map((t, idx) => (
                              <span key={idx} className="bg-primary/5 text-primary text-[10px] px-1 py-0.2 border border-primary/10 rounded-sm">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {c.description && (
                          <p className="text-[11px] text-muted-foreground font-serif italic mt-1 line-clamp-1">{c.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground active:translate-y-0 shadow-none hover:shadow-none"
                        onClick={() => handleDeleteCharacter(c.id)}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content - Chapters and Panels */}
        <div className="space-y-6 lg:col-span-2">
          {/* Chapter tabs */}
          {project.chapters.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-border/30">
              {project.chapters.map((ch) => (
                <Button
                  key={ch.id}
                  variant={activeChapter === ch.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveChapter(ch.id)}
                  className="font-serif"
                >
                  {ch.title}
                </Button>
              ))}
            </div>
          )}

          {/* Panels */}
          {activeChapterData ? (
            <div className="space-y-4">
              {activeChapterData.summary && (
                <div className="bg-muted/20 border border-border/50 p-4 rounded-sm">
                  <h3 className="text-xs font-serif font-bold text-foreground mb-1 uppercase tracking-wider">章节大纲 SUMMARY</h3>
                  <p className="text-sm text-muted-foreground font-serif italic leading-relaxed">{activeChapterData.summary}</p>
                </div>
              )}
              <div className="space-y-4">
                {activeChapterData.panels.map((panel) => (
                  <PanelCard
                    key={panel.id}
                    panel={panel}
                    characterNames={charNameMap}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-border bg-muted/10 rounded-sm">
              <p className="text-lg font-serif italic text-muted-foreground">
                {generating ? "正在生成脚本 GENERATING..." : "暂无分镜内容 NO PANELS"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground font-serif">
                {generating ? "AI 正在笔耕不辍，请稍候..." : "配置 AI 模型后，点击左侧按钮生成精美漫画脚本"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
