import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

const client = new Anthropic();

export async function POST(request: Request) {
  const { userMessage } = await request.json();

  const filePath = join(process.cwd(), "content.json");
  const currentContent = readFileSync(filePath, "utf-8");

  const systemPrompt = `あなたはお店のウェブサイト管理アシスタントです。
以下のcontent.jsonの現在の内容を参照し、ユーザーの指示に従って該当する部分だけを書き換えた、完全なJSONを返してください。
JSONのみを返し、説明文は不要です。マークダウンのコードブロック（\`\`\`json など）も使わず、純粋なJSONテキストのみを返してください。`;

  const userPrompt = `【現在のcontent.json】
${currentContent}

【ユーザーの指示】
${userMessage}`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return Response.json({ error: "AIからの応答が取得できませんでした" }, { status: 500 });
  }

  let newJson: unknown;
  try {
    newJson = JSON.parse(textBlock.text);
  } catch {
    return Response.json(
      { error: "AIが有効なJSONを返しませんでした", raw: textBlock.text },
      { status: 500 }
    );
  }

  return Response.json({ result: newJson });
}
