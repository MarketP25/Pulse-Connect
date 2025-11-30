import { NextResponse } from "next/server";

// Example: POST endpoint to generate content using OpenAI
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // Call OpenAI API (make sure OPENAI_API_KEY is set in your .env.local)
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful content generator." },
            { role: "user", content: prompt },
          ],
          max_tokens: 512,
        }),
      }
    );

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      return NextResponse.json({ error: err }, { status: openaiRes.status });
    }

    const data = await openaiRes.json();
    const content =
      data.choices?.[0]?.message?.content ?? "No content generated.";

    return NextResponse.json({ content });
  } catch (errors) {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
