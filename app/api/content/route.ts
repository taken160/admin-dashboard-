import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  const filePath = join(process.cwd(), "content.json");
  const content = readFileSync(filePath, "utf-8");
  return Response.json(JSON.parse(content));
}
