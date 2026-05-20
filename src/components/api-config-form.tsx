"use client";

import { useState } from "react";
import { Button, Input, Label, Select, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { ApiConfig, ApiProvider } from "@/types";

interface ApiConfigFormProps {
  onTest?: (config: ApiConfig) => Promise<void>;
}

const STORAGE_KEY = "comicforge_api_configs";

function loadStoredConfigs(): ApiConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

export default function ApiConfigForm({ onTest: _onTest }: ApiConfigFormProps) {
  const [configs, setConfigs] = useState<ApiConfig[]>(loadStoredConfigs);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<ApiProvider>("openai");
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [listing, setListing] = useState(false);
  const [error, setError] = useState("");

  function saveConfigs(newConfigs: ApiConfig[]) {
    setConfigs(newConfigs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
  }

  async function handleListModels() {
    if (!baseUrl || !apiKey) {
      setError("请填写 Base URL 和 API Key");
      return;
    }

    setListing(true);
    setError("");

    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: provider, baseUrl, apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "获取模型列表失败");
        return;
      }

      setModels(data.models || []);
      if (data.models?.length > 0) {
        setSelectedModel(data.models[0]);
      }
    } catch {
      setError("网络错误，无法连接 API");
    } finally {
      setListing(false);
    }
  }

  function handleSave() {
    if (!name || !baseUrl || !apiKey || !selectedModel) {
      setError("请填写所有字段");
      return;
    }

    const newConfig: ApiConfig = {
      id: Date.now().toString(),
      name,
      provider,
      baseUrl,
      apiKey,
      models,
      selectedModel,
    };

    saveConfigs([...configs, newConfig]);
    setName("");
    setBaseUrl("");
    setApiKey("");
    setModels([]);
    setSelectedModel("");
    setError("");
  }

  function handleDelete(id: string) {
    saveConfigs(configs.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
          <CardTitle className="text-lg font-serif font-bold text-foreground">添加 API 配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="provider" className="text-sm font-serif font-bold text-foreground">AI 提供商</Label>
            <Select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as ApiProvider)}
            >
              <option value="openai">OpenAI 格式</option>
              <option value="claude">Claude 格式</option>
              <option value="gemini">Gemini 格式</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-serif font-bold text-foreground">配置名称</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：我的 OpenAI 代理"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="text-sm font-serif font-bold text-foreground">Base URL</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-serif font-bold text-foreground">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
            <p className="text-xs text-muted-foreground font-sans">
              API Key 仅存储在浏览器本地，不会发送到服务器
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-serif font-bold text-foreground">可用模型</Label>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={models.length === 0}
              >
                {models.length === 0 ? (
                  <option value="">先点击获取模型列表</option>
                ) : (
                  models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                )}
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={handleListModels}
              disabled={listing || !baseUrl || !apiKey}
              className="mb-0"
            >
              {listing ? "获取中..." : "获取模型"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive font-serif italic">{error}</p>}

          <div className="pt-2">
            <Button onClick={handleSave} variant="secondary" disabled={!selectedModel}>
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>

      {configs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-serif font-bold text-muted-foreground uppercase tracking-wider">已保存配置</h3>
          {configs.map((config) => (
            <Card key={config.id} className="hover:bg-accent/5">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-serif font-bold text-foreground">{config.name}</p>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    {config.baseUrl} / {config.selectedModel}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setName(config.name);
                      setProvider(config.provider || "openai");
                      setBaseUrl(config.baseUrl);
                      setApiKey(config.apiKey);
                      setModels(config.models);
                      setSelectedModel(config.selectedModel);
                      handleDelete(config.id);
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(config.id)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
