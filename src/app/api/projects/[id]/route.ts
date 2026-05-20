import { NextRequest, NextResponse } from "next/server";
import { fileStore } from "@/lib/store/file-store";
import type { ProjectMeta } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = await fileStore.loadFullProject(id);
    return NextResponse.json({
      id,
      name: data.meta.name,
      style: data.meta.style,
      description: data.meta.description,
      characters: data.characters,
      chapters: data.chapters,
      createdAt: data.meta.createdAt,
      updatedAt: data.meta.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const meta = await fileStore.getMeta(id);

    const updated: ProjectMeta = {
      ...meta,
      ...(body.name && { name: body.name }),
      ...(body.style && { style: body.style }),
      ...(body.description !== undefined && { description: body.description }),
      updatedAt: new Date().toISOString(),
    };

    await fileStore.saveMeta(id, updated);
    return NextResponse.json({ project: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await fileStore.deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
