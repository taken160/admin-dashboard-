const GITHUB_API = "https://api.github.com";
const OWNER = process.env.GITHUB_OWNER!;
const REPO = process.env.GITHUB_REPO!;
const BRANCH = process.env.GITHUB_BRANCH!;
const FILE_PATH = process.env.GITHUB_FILE_PATH!;
const TOKEN = process.env.GITHUB_TOKEN!;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
};

export async function POST(request: Request) {
  const { content } = await request.json();

  // 現在のファイルのSHAを取得（更新に必要）
  const getRes = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
    { headers }
  );
  if (!getRes.ok) {
    return Response.json({ error: "GitHubからファイル情報を取得できませんでした" }, { status: 500 });
  }
  const fileData = await getRes.json();
  const sha: string = fileData.sha;

  // content.json を base64 エンコードして更新
  const newContent = Buffer.from(JSON.stringify(content, null, 2)).toString("base64");

  const putRes = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "feat: update content.json via admin dashboard",
        content: newContent,
        sha,
        branch: BRANCH,
      }),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.json();
    return Response.json({ error: "GitHubへの書き込みに失敗しました", detail: err }, { status: 500 });
  }

  return Response.json({ success: true });
}
