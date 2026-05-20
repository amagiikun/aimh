"use client";

import { Card, CardContent } from "@/components/ui";
import type { Panel } from "@/types";

interface PanelCardProps {
  panel: Panel;
  characterNames: Record<string, string>;
}

export default function PanelCard({ panel, characterNames }: PanelCardProps) {
  return (
    <Card className="border-l border-l-primary/40 hover:bg-accent/5">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground font-sans">
          <span className="font-medium">
            S{panel.sceneNumber}P{panel.panelNumber}
          </span>
          {panel.emotion && (
            <span className="rounded bg-accent/20 px-1.5 py-0.5 border border-border/10 text-muted-foreground">{panel.emotion}</span>
          )}
        </div>

        <p className="mb-2 text-sm leading-relaxed text-foreground font-serif">
          {panel.description}
        </p>

        {panel.narration && (
          <p className="mb-2 text-sm italic text-muted-foreground font-serif bg-muted/30 p-2 border-l border-primary/20 rounded-sm">
            {panel.narration}
          </p>
        )}

        {panel.dialogue && (
          <p className="mb-2 text-sm font-medium font-serif pl-3 border-l-2 border-secondary/40 text-foreground/90">
            &ldquo;{panel.dialogue}&rdquo;
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-border/10">
          {panel.characters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {panel.characters.map((charId) => (
                <span
                  key={charId}
                  className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs text-primary font-sans border border-primary/20"
                >
                  {characterNames[charId] || charId}
                </span>
              ))}
            </div>
          )}
          {panel.action && (
            <span className="text-xs text-muted-foreground font-serif italic ml-auto">{panel.action}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
