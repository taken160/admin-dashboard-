"use client";

import { useEffect, useRef, useState } from "react";

type ContentJson = Record<string, unknown>;

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; result?: ContentJson }
  | { role: "error"; text: string };

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingResult, setPendingResult] = useState<ContentJson | null>(null);
  const [publishStatus, setPublishStatus] = useState<"idle" | "success" | "error">("idle");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        setAuthError("パスワードが違います");
      }
    } catch {
      setAuthError("通信エラーが発生しました");
    } finally {
      setAuthLoading(false);
    }
  }

  // ログイン前の画面
  if (!authed) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-md px-10 py-10 w-full max-w-sm">
          <h1 className="text-xl font-semibold text-gray-800 mb-1 text-center">🍝 Trattoria Bella</h1>
          <p className="text-sm text-gray-500 text-center mb-8">管理ダッシュボード</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">パスワード</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="パスワードを入力"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            {authError && <p className="text-xs text-red-600">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading || !passwordInput}
              className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {authLoading ? "確認中..." : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    setPendingResult(null);
    setPublishStatus("idle");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "error", text: data.error ?? "エラーが発生しました" },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "変更内容を確認してください。", result: data.result },
        ]);
        setPendingResult(data.result);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "error", text: "通信エラーが発生しました" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!pendingResult) return;
    setLoading(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: pendingResult }),
      });
      if (res.ok) {
        setPublishStatus("success");
        setPendingResult(null);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "✅ content.json を更新しました。Vercelが自動で再デプロイします（約30秒〜1分後にサイトに反映されます）。" },
        ]);
      } else {
        setPublishStatus("error");
      }
    } catch {
      setPublishStatus("error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">
          🍝 Trattoria Bella — 管理ダッシュボード
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          チャットで指示するだけで、お店のサイト情報を更新できます
        </p>
      </header>

      {/* メインエリア：左＝実際のサイト、右＝チャット（7:3） */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左パネル：実際のサイト（iframe） */}
        <div className="flex flex-col border-r border-gray-200" style={{ width: "70%" }}>
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"></span>
              <span className="text-xs text-gray-500 font-medium">damishop-brown.vercel.app</span>
            </div>
            <button
              onClick={() => iframeRef.current?.contentWindow?.location.reload()}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
            >
              ↻ 再読み込み
            </button>
          </div>
          <iframe
            ref={iframeRef}
            src="https://damishop-brown.vercel.app/"
            className="flex-1 w-full border-none"
            title="Trattoria Bella サイトプレビュー"
          />
        </div>

        {/* 右パネル：チャット */}
        <div className="flex flex-col overflow-hidden" style={{ width: "30%" }}>

      {/* チャット履歴 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-16">
            <p className="text-lg">💬 どんな変更をしますか？</p>
            <p className="text-sm mt-2">例：「営業時間を月〜金 10時〜20時に変えて」</p>
            <p className="text-sm">例：「お知らせを『本日は満席です』に更新して」</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : msg.role === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-white text-gray-800 border border-gray-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* JSONプレビュー */}
              {msg.role === "assistant" && msg.result && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">変更後のデータ（プレビュー）</p>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto max-h-64 text-gray-700">
                    {JSON.stringify(msg.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-500 shadow-sm">
              <span className="animate-pulse">AIが考えています...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 公開ボタン */}
      {pendingResult && (
        <div className="px-4 pb-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              変更内容を確認しました。公開しますか？
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setPendingResult(null); setPublishStatus("idle"); }}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handlePublish}
                disabled={loading}
                className="text-sm px-4 py-1.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
              >
                公開する
              </button>
            </div>
          </div>
          {publishStatus === "error" && (
            <p className="text-xs text-red-600 mt-1 px-1">公開に失敗しました。もう一度お試しください。</p>
          )}
        </div>
      )}

      {/* 入力エリア */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例：「定休日を火曜日に変えて」「ボロネーゼの値段を1800円にして」"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Enter で送信 / Shift+Enter で改行
        </p>
      </div>

        </div>{/* 右パネル終わり */}
      </div>{/* メインエリア終わり */}
    </div>
  );
}

