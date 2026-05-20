import { NextRequest, NextResponse } from "next/server";
import { fileStore } from "@/lib/store/file-store";
import { generateId } from "@/lib/utils";
import type { ProjectMeta } from "@/types";

export async function GET() {
  try {
    const projects = await fileStore.listProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, style, description } = await request.json();

    if (!name || !style) {
      return NextResponse.json(
        { error: "Missing required fields: name, style" },
        { status: 400 },
      );
    }

    const id = generateId();
    const now = new Date().toISOString();

    const meta: ProjectMeta = {
      id,
      name,
      style,
      description: description || "",
      createdAt: now,
      updatedAt: now,
    };

    await fileStore.saveMeta(id, meta);
    await fileStore.saveCharacters(id, []);

    return NextResponse.json({ project: meta }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
