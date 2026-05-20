import { NextRequest, NextResponse } from "next/server";
import { listModels } from "@/lib/ai/provider";

export async function POST(request: NextRequest) {
  try {
    const { type, baseUrl, apiKey } = await request.json();

    if (!type || !baseUrl || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields: type, baseUrl, apiKey" },
        { status: 400 },
      );
    }

    const models = await listModels(type, baseUrl, apiKey);
    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
