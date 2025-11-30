import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Call OpenAI API
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo", // or 'gpt-4' if you have access
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: message },
          ],
          max_tokens: 256,
        }),
      }
    );

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      return NextResponse.json({ error: err }, { status: openaiRes.status });
    }

    const data = await openaiRes.json();
    const aiResponse = data.choices?.[0]?.message?.content ?? "No response";

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
