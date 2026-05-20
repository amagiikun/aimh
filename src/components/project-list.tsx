"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Skeleton } from "@/components/ui";
import type { ProjectListItem } from "@/types";

export default function ProjectList() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("确定删除此项目？")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-border bg-muted/30 rounded-sm">
        <p className="text-lg font-serif italic text-muted-foreground">暂无项目 NO PROJECTS</p>
        <p className="mt-2 text-sm text-muted-foreground">点击上方按钮创建第一个漫画项目</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="cursor-pointer transition-all duration-300 hover:shadow-neo bg-card hover:bg-accent/10 border-border"
          onClick={() => router.push(`/projects/${project.id}`)}
        >
          <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg font-serif font-bold text-foreground">{project.name}</CardTitle>
                <div className="mt-2">
                  <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 border border-primary/20 rounded-sm">
                    {project.style}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleDelete(e, project.id)}
                className="hover:bg-destructive hover:text-destructive-foreground"
              >
                删除
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="line-clamp-3 text-sm text-muted-foreground min-h-[60px] font-sans">
              {project.description || "暂无项目描述..."}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs font-medium text-muted-foreground font-sans">
              <span className="bg-accent/30 px-2 py-0.5 border border-border/30 rounded-sm">章节数: {project.chapterCount}</span>
              <span>更新: {new Date(project.updatedAt).toLocaleDateString("zh-CN")}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
