"use client";

import { useEffect, useRef, useState } from "react";
import { cleanExcerpt } from "@/lib/chat/segments";
import { AnswerText, CitationBadge } from "./citations";
import { ArrowUpIcon, BotAvatar, ChevronDownIcon, RefreshIcon } from "./icons";

const MAX_QUESTION_LENGTH = 1000;
/** The character counter only shows up close to the limit. */
const COUNTER_THRESHOLD = 800;

const EXAMPLE_QUESTIONS = [
  "Quels sont les horaires du support ?",
  "Quel est le délai de livraison ?",
  "Comment contacter le service client ?",
];

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function send(raw: string) {
    const text = raw.trim();
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
      inputRef.current?.focus();
    }
  }

  function ask(event: React.FormEvent) {
    event.preventDefault();
    void send(question);
  }

  function reset() {
    setMessages([]);
    setConversationId(null);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div role="log" aria-live="polite" aria-label="Conversation" className="flex flex-col gap-5">
        {messages.length === 0 && !pending && <EmptyState onPick={send} />}
        {messages.map((message, i) =>
          message.role === "user" ? (
            <p
              key={i}
              className="max-w-[85%] self-end whitespace-pre-wrap rounded-3xl rounded-br-md bg-sage-600 px-4 py-2.5 text-white shadow-sm"
            >
              {message.content}
            </p>
          ) : (
            <div key={i} className="flex max-w-[92%] gap-3">
              <BotAvatar />
              <article
                aria-label="Réponse de DocBot"
                className={`flex min-w-0 flex-1 flex-col gap-3 rounded-3xl rounded-tl-md px-4 py-3 ${
                  message.notFound
                    ? "border border-dashed border-cream-300 bg-cream-100/60 text-stone-600 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-400"
                    : "border border-cream-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
                }`}
              >
                <AnswerText text={message.content} />
                {message.sources.length > 0 && <SourceList sources={message.sources} />}
              </article>
            </div>
          ),
        )}
        {pending && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={ask}
        className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 bg-gradient-to-t from-cream-50 from-70% to-transparent px-4 pt-6 pb-4 dark:from-stone-950"
      >
        <label htmlFor="question" className="sr-only">
          Votre question
        </label>
        <div className="flex items-center gap-2 rounded-full border border-cream-200 bg-white p-1.5 pl-5 shadow-md shadow-stone-900/5 transition focus-within:border-sage-400 focus-within:ring-4 focus-within:ring-sage-200/60 dark:border-stone-800 dark:bg-stone-900 dark:focus-within:border-sage-600 dark:focus-within:ring-sage-900/60">
          <input
            ref={inputRef}
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="Posez votre question…"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 text-stone-800 placeholder:text-stone-400 focus:outline-none dark:text-stone-100 dark:placeholder:text-stone-500"
          />
          <button
            type="submit"
            disabled={pending || !question.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white transition hover:bg-sage-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 disabled:cursor-not-allowed disabled:bg-stone-300 dark:hover:bg-sage-500 dark:disabled:bg-stone-700"
          >
            <span className="sr-only">Envoyer</span>
            <ArrowUpIcon />
          </button>
        </div>
        <div className="flex min-h-5 items-center justify-between px-4 text-xs text-stone-500 dark:text-stone-400">
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-full hover:text-sage-700 dark:hover:text-sage-300"
            >
              <RefreshIcon className="size-3.5" />
              Nouvelle conversation
            </button>
          ) : (
            <span>Réponses tirées uniquement de la documentation.</span>
          )}
          {question.length > COUNTER_THRESHOLD && (
            <span aria-live="polite">
              {question.length} / {MAX_QUESTION_LENGTH}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-cream-200 bg-cream-100/70 px-6 py-8 text-center dark:border-stone-800 dark:bg-stone-900/50">
      <p className="font-medium text-stone-700 dark:text-stone-200">Bonjour ! Comment puis-je vous aider ?</p>
      <ul aria-label="Exemples de questions" className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUESTIONS.map((example) => (
          <li key={example}>
            <button
              type="button"
              onClick={() => onPick(example)}
              className="rounded-full border border-sage-200 bg-white px-4 py-2 text-sm text-sage-800 transition hover:border-sage-400 hover:bg-sage-50 dark:border-sage-800 dark:bg-stone-900 dark:text-sage-200 dark:hover:border-sage-600 dark:hover:bg-sage-950"
            >
              {example}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="flex flex-col gap-2 border-t border-cream-200 pt-3 dark:border-stone-800">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">Sources</p>
      <ul aria-label="Sources" className="flex flex-col gap-2">
        {sources.map((source) => (
          <li key={source.ref}>
            <details className="group rounded-2xl border border-cream-200 bg-cream-50 text-sm transition open:bg-cream-100/70 dark:border-stone-800 dark:bg-stone-950 dark:open:bg-stone-950">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-3 py-2 text-stone-700 hover:text-sage-800 focus-visible:outline-2 focus-visible:outline-sage-500 dark:text-stone-200 dark:hover:text-sage-200 [&::-webkit-details-marker]:hidden">
                <CitationBadge refNumber={source.ref} />{" "}
                <span className="min-w-0 flex-1 truncate font-medium">{source.documentTitle}</span>
                <ChevronDownIcon className="size-4 shrink-0 text-stone-400 transition group-open:rotate-180" />
              </summary>
              <p className="mx-3 mb-3 border-l-2 border-sage-300 pl-3 leading-relaxed text-stone-600 dark:border-sage-700 dark:text-stone-400">
                {cleanExcerpt(source.excerpt)}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <BotAvatar />
      <p className="flex items-center gap-2 rounded-3xl rounded-tl-md border border-cream-200 bg-white px-4 py-2.5 text-sm text-stone-500 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
        <span aria-hidden className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="typing-dot size-1.5 rounded-full bg-sage-500"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        DocBot cherche dans la documentation…
      </p>
    </div>
  );
}
