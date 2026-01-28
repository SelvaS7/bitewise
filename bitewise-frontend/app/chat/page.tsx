"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Hi! I'm the BiteWise AI coach. Ask me about meal ideas, macros, or tips.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [dotCount, setDotCount] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) return;
    setDotCount(0);
    const t = setInterval(() => setDotCount((c) => (c + 1) % 4), 400);
    return () => clearInterval(t);
  }, [loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      let profile: any = undefined;
      try {
        const raw = localStorage.getItem("userProfile");
        if (raw) profile = JSON.parse(raw);
      } catch {}

      const diaryRaw = localStorage.getItem("meals");
      const recentMeals = diaryRaw ? JSON.parse(diaryRaw) : [];
      const lastMessages = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, profile, recentMeals, lastMessages }),
      });

      const data = await res.json();
      const reply =
        (data && data.reply) ||
        "Sorry, I couldn't process that. Please try again.";

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "There was a network issue contacting the AI. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const requestRecipes = async () => {
    if (loadingRecipes) return;
    setLoadingRecipes(true);

    try {
      const profileRaw = localStorage.getItem("userProfile");
      let needProteinG: number | undefined = undefined;

      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        const diaryRaw = localStorage.getItem("meals");
        const meals = diaryRaw ? JSON.parse(diaryRaw) : [];
        const proteinConsumed = meals.reduce((a: number, m: any) => a + (m.protein || 0), 0);
        const proteinGoal = p?.calories?.protein || 120;
        const gap = Math.max(0, Math.round(proteinGoal - proteinConsumed));
        if (gap > 0) needProteinG = gap;
      }

      const res = await fetch("http://127.0.0.1:8000/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needProteinG }),
      });

      const data = await res.json();
      const recipes = data.recipes || [];

      const formatted = recipes
        .map(
          (r: any, i: number) =>
            `${i + 1}. ${r.title} (${r.calories} cal, ${r.protein}g P, ${r.carbs}g C, ${r.fat}g F, ${r.fiber}g Fib)\n` +
            `Ingredients: ${r.ingredients.join(", ")}\n` +
            `Steps: ${r.instructions.join(" ")}`
        )
        .join("\n\n");

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Here are some recipes:",
          timestamp: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: formatted || "No recipes available right now.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Couldn't fetch recipes. Try again later." },
      ]);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const quickReplies = [
    "Suggest high-protein breakfasts",
    "How many calories should I eat to lose fat?",
    "Easy 30-minute dinners under 600 cal",
  ];

  const handleQuickReply = (text: string) => {
    setInput(text);
    setTimeout(() => sendMessage(), 150);
  };

  const parseNutritionFromText = (text: string) => {
    const caloriesMatch = text.match(/(\d{2,4})\s*(?:k?cal|cal)/i);
    if (!caloriesMatch) return null;

    return {
      name: text.split("\n")[0].slice(0, 120),
      calories: Number(caloriesMatch[1]),
    };
  };

  const trySaveMessageAsMeal = (msg: ChatMessage) => {
    const parsed = parseNutritionFromText(msg.content);
    if (!parsed) {
      alert("Couldn't extract nutrition info from that message.");
      return;
    }
    alert("Saved parsed item to meals.");
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>BiteWise AI Chat</h1>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={requestRecipes} disabled={loadingRecipes}>
              {loadingRecipes ? "Loading recipes..." : "Get recipes"}
            </button>
            <button onClick={() => router.push("/dashboard")}>Back</button>
          </div>
        </header>

        <div className={styles.chatArea}>
          {messages.map((m) => (
            <div
              key={m.id}
              className={`${styles.msgRow} ${m.role === "user" ? styles.msgUser : ""}`}
            >
              <div
                className={`${styles.bubble} ${
                  m.role === "assistant" ? styles.assistant : styles.user
                }`}
              >
                {m.content}
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>
                  {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ""}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className={styles.msgRow}>
              <div className={`${styles.bubble} ${styles.assistant}`}>
                Thinking{".".repeat(dotCount)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className={styles.quickReplies}>
          {quickReplies.map((q) => (
            <button key={q} className={styles.quickBtn} onClick={() => handleQuickReply(q)}>
              {q}
            </button>
          ))}
        </div>

        <div className={styles.footer}>
          <input
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for high-protein meals, diet tips, etc."
          />
          <button
            className={styles.sendBtn}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
