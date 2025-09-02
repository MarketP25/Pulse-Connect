import { NextResponse } from "next/server";
import { TranslationService } from "@/lib/services/translationService";

export async function POST(request: Request) {
  try {
    const { text, targetLanguage, sourceLanguage } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const translationService = new TranslationService();

    const result = await translationService.translateMessage(text, targetLanguage, sourceLanguage);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
