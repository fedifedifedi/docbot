"use client";

import { useEffect, useRef, useState } from "react";

const MAX_QUESTION_LENGTH = 1000;

type Source = { ref: number; documentTitle: string; excerpt: string };
type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sources: Source[]; notFound: boolean };

type ChatResponse = {
  conversationId: string;
  answer: string;
  sources: Source[];
  notFound: boolean;
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || pending) return;

    setError(null);
    setPending(true);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setQuestion("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, conversationId }),
      });
      const data = (await res.json().catch(() => null)) as (ChatResponse & { error?: string }) | null;
      if (!res.ok || !data || data.error) {
        throw new Error(data?.error ?? "Une erreur est survenue.");
      }
      setConversationId(data.conversationId);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, sources: data.sources, notFound: data.notFound },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      // Give the question back so it can be re-sent.
      setMessages((m) => m.slice(0, -1));
      setQuestion(text);
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div role="log" aria-live="polite" aria-label="Conversation" className="flex flex-col gap-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Exemple : « Quels sont les horaires du support ? »
          </p>
        )}
        {messages.map((message, i) =>
          message.role === "user" ? (
            <p
              key={i}
              className="self-end whitespace-pre-wrap rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {message.content}
            </p>
          ) : (
            <article
              key={i}
              aria-label="Réponse de DocBot"
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <p className={`whitespace-pre-wrap ${message.notFound ? "text-zinc-500" : ""}`}>
                {message.content}
              </p>
              {message.sources.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sources</p>
                  <ul aria-label="Sources" className="flex flex-col gap-2">
                    {message.sources.map((source) => (
                      <li key={source.ref} className="text-sm">
                        <details>
                          <summary className="cursor-pointer">
                            [{source.ref}] {source.documentTitle}
                          </summary>
                          <p className="mt-1 border-l-2 border-zinc-200 pl-3 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                            {source.excerpt}
                          </p>
                        </details>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ),
        )}
        {pending && <p className="text-sm text-zinc-500">DocBot cherche dans la documentation…</p>}
        <div ref={endRef} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={ask} className="sticky bottom-0 flex flex-col gap-2 bg-[var(--background)] py-3">
        <label htmlFor="question" className="sr-only">
          Votre question
        </label>
        <div className="flex gap-2">
          <input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="Posez votre question…"
            autoComplete="off"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={pending || !question.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Envoyer
          </button>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="self-start text-xs text-zinc-500 hover:underline"
          >
            Nouvelle conversation
          </button>
        )}
      </form>
    </div>
  );
}
