"use client";

import { useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";

interface ProjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProjectForm({ onSuccess, onCancel }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!name.trim() || !style.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), style: style.trim(), description: description.trim() }),
      });

      if (res.ok) {
        onSuccess();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 border border-border p-6 bg-card shadow-neo mb-8 rounded-sm">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-serif font-bold text-foreground">项目名称</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：星辰之旅"
          aria-invalid={attemptedSubmit && !name.trim() ? "true" : "false"}
          required
        />
        {attemptedSubmit && !name.trim() && (
          <p className="text-destructive font-serif italic text-xs mt-1">项目名称是必填项！</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="style" className="text-sm font-serif font-bold text-foreground">漫画风格</Label>
        <Input
          id="style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          placeholder="例如：日式热血、赛博朋克、古风仙侠"
          aria-invalid={attemptedSubmit && !style.trim() ? "true" : "false"}
          required
        />
        {attemptedSubmit && !style.trim() && (
          <p className="text-destructive font-serif italic text-xs mt-1">漫画风格是必填项！</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-serif font-bold text-foreground">故事简介</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="简要描述故事背景和核心设定..."
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-4 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="secondary" disabled={saving}>
          {saving ? "创建中..." : "创建项目"}
        </Button>
      </div>
    </form>
  );
}
