import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/atoms/Button";
import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { chatWithMentor } from "@/api/client";
import { EmptyState } from "@/molecules/EmptyState";
import { useAppState } from "@/state/AppState";
import type { MentorChatMessage } from "@/types";
import styles from "./MentorPage.module.scss";

export function MentorPage() {
  const { candidateId, report, setPage, setStatus } = useAppState();
  const [messages, setMessages] = useState<MentorChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm your CareerPilot Mentor. Ask about your hiring sprint, gaps, resume bullets, or interview prep."
    }
  ]);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState([
    "Walk me through Day 1 of my hiring sprint.",
    "What GitHub project should I ship this week?",
    "Give me 3 interview drills for my role."
  ]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  if (!candidateId) {
    return (
      <EmptyState
        icon="💬"
        title="Mentor needs a candidate"
        description="Upload a resume first so mentoring can use your profile and readiness report."
        actionLabel="Upload Resume"
        onAction={() => setPage("upload")}
      />
    );
  }

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setDraft("");
    setBusy(true);
    setStatus("Mentor is thinking...");
    try {
      const data = await chatWithMentor(
        candidateId,
        message,
        history,
        report?.report_id
      );
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.suggestions?.length) setSuggestions(data.suggestions);
      setStatus("Mentor replied.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Mentor chat failed");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't reach the mentoring service. Check that Gemini is configured and try again."
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
    <div className={styles.grid}>
      <Panel span={8} className={styles.chatPanel}>
        <span className={styles.kicker}>AI Mentoring</span>
        <h2>Career mentor chat</h2>
        <Text muted tiny>
          Grounded in your latest report
          {report ? ` · ${report.target_role} · score ${report.readiness_score ?? "n/a"}` : " · run analysis for richer context"}.
        </Text>
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
            placeholder="Ask about your next hiring step..."
            disabled={busy}
          />
          <Button variant="primary" type="submit" disabled={busy || !draft.trim()}>
            Send
          </Button>
        </form>
      </Panel>

      <Panel span={4} delay={1}>
        <span className={styles.kicker}>Quick prompts</span>
        <h2>Suggested asks</h2>
        <div className={styles.suggestions}>
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.suggestion}
              onClick={() => void send(item)}
              disabled={busy}
            >
              {item}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
