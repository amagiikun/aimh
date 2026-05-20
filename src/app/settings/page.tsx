"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ApiConfigForm from "@/components/api-config-form";
import { Button } from "@/components/ui";
import type { ApiConfig } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
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

  function handleImportConfig() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const config = JSON.parse(text) as ApiConfig;
        const stored = localStorage.getItem("comicforge_api_configs");
        const configs: ApiConfig[] = stored ? JSON.parse(stored) : [];
        configs.push({ ...config, id: Date.now().toString() });
        localStorage.setItem("comicforge_api_configs", JSON.stringify(configs));
        window.location.reload();
      } catch {
        alert("配置文件格式无效");
      }
    };
    input.click();
  }

  if (!authChecked) return null;

  return (
    <div>
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">设置</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              AI 模型与 API 配置管理
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleImportConfig}>
              导入配置
            </Button>
            <Button variant="ghost" onClick={() => router.push("/")}>
              返回
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl">
        <ApiConfigForm />
      </main>
    </div>
  );
}
