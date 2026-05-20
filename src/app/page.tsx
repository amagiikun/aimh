"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProjectList from "@/components/project-list";
import ProjectForm from "@/components/project-form";
import { Button } from "@/components/ui";

export default function HomePage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const checkAuth = useCallback(async () => {
    const envCheck = await fetch("/api/auth").then((r) => r.json());
    if (envCheck.required) {
      const res = await fetch("/api/projects");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!authChecked) return null;

  return (
    <div>
      <header className="mb-12 border-b border-border pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-black tracking-tight text-foreground">
              Comic<span className="text-secondary font-serif font-black italic ml-1">Forge</span>
            </h1>
            <p className="mt-4 text-base font-serif italic text-muted-foreground">
              AI 漫画脚本与分镜生成平台 <span className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm text-xs not-italic text-primary font-sans">BETA v0.1</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="default" onClick={() => router.push("/settings")}>
              设置
            </Button>
            <Button size="default" variant="secondary" onClick={() => setShowForm(true)}>
              新建项目
            </Button>
          </div>
        </div>
      </header>

      <main>
        {showForm ? (
          <div className="mb-8">
            <ProjectForm
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : null}
        <ProjectList />
      </main>
    </div>
  );
}
