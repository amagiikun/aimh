import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ComicForge - AI 漫画脚本与分镜生成平台",
  description: "轻量级 AI 漫画制作平台，快速生成结构化脚本与分镜",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased bg-background text-foreground bg-halftone">
        <div className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-background border border-border p-6 sm:p-8 md:p-12 shadow-neo-lg min-h-[calc(100vh-4rem)] rounded-sm">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
