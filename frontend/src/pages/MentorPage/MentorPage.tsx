import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/atoms/Button";
import { chatWithMentor } from "@/api/client";
import { useAppState } from "@/state/AppState";
import type { MentorChatMessage } from "@/types";
import styles from "./MentorPage.module.scss";

const DEFAULT_SUGGESTIONS = [
  "Walk me through Day 1 of my hiring sprint.",
  "What should I learn first from my skill gaps?",
  "Give me 3 interview drills for my role."
];

export function MentorPage() {
  const { candidateId, report, setStatus } = useAppState();
  const [messages, setMessages] = useState<MentorChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm your CareerPilot Mentor. Ask about your hiring sprint, gaps, resume bullets, or interview prep."
    }
  ]);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  if (!report || !candidateId) return null;

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setDraft("");
    setBusy(true);
    setStatus("Mentor is thinking...");
    try {
      const data = await chatWithMentor(candidateId, message, history, report.report_id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.suggestions?.length) setSuggestions(data.suggestions.slice(0, 4));
      setStatus("Mentor replied.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Mentor chat failed");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't reach the mentoring service. Check that Gemini is configured and try again."
        }
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  return (
    <div className={styles.page}>
      <section className={styles.chatCard}>
        <header className={styles.chatHead}>
          <div>
            <p className={styles.kicker}>AI Mentor</p>
            <h2 className={styles.title}>Ask your mentor</h2>
            <p className={styles.meta}>
              Coaching grounded in your readiness report — ask about gaps, sprint days, or interview
              prep.
            </p>
          </div>
        </header>

        <div className={styles.prompts} aria-label="Suggested questions">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.prompt}
              onClick={() => void send(item)}
              disabled={busy}
            >
              {item}
            </button>
          ))}
        </div>

        <div className={styles.thread}>
          {messages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={`${styles.bubble} ${msg.role === "user" ? styles.user : styles.bot}`}
            >
              <span className={styles.role}>{msg.role === "user" ? "You" : "Mentor"}</span>
              <p>{msg.content}</p>
            </div>
          ))}
          {busy && <div className={styles.typing}>Mentor is typing…</div>}
          <div ref={endRef} />
        </div>

        <form className={styles.composer} onSubmit={onSubmit}>
          <input
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your next hiring step…"
            disabled={busy}
            aria-label="Message to mentor"
          />
          <Button variant="primary" type="submit" disabled={busy || !draft.trim()}>
            Send
          </Button>
        </form>
      </section>
    </div>
  );
}
