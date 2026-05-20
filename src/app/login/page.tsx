"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        setRequired(data.required);
        if (!data.required) {
          router.push("/");
        }
      })
      .finally(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (data.authenticated) {
      router.push("/");
    } else {
      setError("密码错误");
    }
  }

  if (checking) return null;

  if (!required) return null;

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center border-b border-border/50 bg-muted/20 pb-4">
          <CardTitle className="text-2xl font-serif font-black tracking-tight text-foreground">
            Comic<span className="text-secondary font-serif font-black italic ml-1">Forge</span>
          </CardTitle>
          <CardDescription className="font-serif italic text-muted-foreground mt-1">AI 漫画脚本与分镜生成平台</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-serif font-bold text-foreground">访问密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive font-serif italic">{error}</p>}
            <div className="pt-2">
              <Button type="submit" variant="secondary" className="w-full">
                进入 ENTER
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
