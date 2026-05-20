import { NextRequest, NextResponse } from "next/server";
import { fileStore } from "@/lib/store/file-store";
import { generateId } from "@/lib/utils";
import type { Character } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId query parameter" },
        { status: 400 },
      );
    }

    const characters = await fileStore.getCharacters(projectId);
    return NextResponse.json({ characters });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get characters";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, name, description, traits } = await request.json();

    if (!projectId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, name" },
        { status: 400 },
      );
    }

    const characters = await fileStore.getCharacters(projectId);

    const newCharacter: Character = {
      id: generateId(),
      name,
      description: description || "",
      traits: traits || [],
      createdAt: new Date().toISOString(),
    };

    characters.push(newCharacter);
    await fileStore.saveCharacters(projectId, characters);

    return NextResponse.json({ character: newCharacter }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create character";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { projectId, characterId, name, description, traits } = await request.json();

    if (!projectId || !characterId) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, characterId" },
        { status: 400 },
      );
    }

    const characters = await fileStore.getCharacters(projectId);
    const index = characters.findIndex((c) => c.id === characterId);

    if (index === -1) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    if (name !== undefined) characters[index].name = name;
    if (description !== undefined) characters[index].description = description;
    if (traits !== undefined) characters[index].traits = traits;

    await fileStore.saveCharacters(projectId, characters);

    return NextResponse.json({ character: characters[index] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update character";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const characterId = searchParams.get("characterId");

    if (!projectId || !characterId) {
      return NextResponse.json(
        { error: "Missing required params: projectId, characterId" },
        { status: 400 },
      );
    }

    const characters = await fileStore.getCharacters(projectId);
    const filtered = characters.filter((c) => c.id !== characterId);

    if (filtered.length === characters.length) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    await fileStore.saveCharacters(projectId, filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete character";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
