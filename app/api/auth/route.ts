export async function POST(request: Request) {
  const { password } = await request.json();
  const correct = process.env.DASHBOARD_PASSWORD;

  if (!correct) {
    return Response.json({ error: "パスワードが設定されていません" }, { status: 500 });
  }

  if (password !== correct) {
    return Response.json({ error: "パスワードが違います" }, { status: 401 });
  }

  return Response.json({ success: true });
}
