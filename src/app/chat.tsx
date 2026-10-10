"use client";

import { useEffect, useRef, useState } from "react";
import { cleanExcerpt } from "@/lib/chat/segments";
import { AnswerText, CitationBadge } from "./citations";
import { ArrowRightIcon, ArrowUpIcon, BotAvatar, ChevronDownIcon, RefreshIcon } from "./icons";

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
              className="max-w-[85%] origin-bottom-right animate-fade-up self-end whitespace-pre-wrap rounded-3xl rounded-br-md bg-gradient-to-br from-sage-600 to-sage-700 px-4 py-2.5 text-white shadow-md shadow-sage-900/15"
            >
              {message.content}
            </p>
          ) : (
            <div key={i} className="flex max-w-[92%] animate-fade-up gap-3">
              <BotAvatar />
              <article
                aria-label="Réponse de DocBot"
                className={`flex min-w-0 flex-1 flex-col gap-3 rounded-3xl rounded-tl-md px-4 py-3 ${
                  message.notFound
                    ? "border border-dashed border-clay-200 bg-clay-50/80 text-stone-600 dark:border-clay-700/60 dark:bg-stone-900/70 dark:text-stone-400"
                    : "border border-cream-200 bg-white/90 shadow-lg shadow-stone-900/5 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90"
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
        // The fade behind the composer spans the whole screen width, not just the column.
        className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 px-4 pt-6 pb-4 before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:bg-gradient-to-t before:from-cream-50 before:from-55% before:to-transparent dark:before:from-stone-950"
      >
        <label htmlFor="question" className="sr-only">
          Votre question
        </label>
        <div className="flex items-center gap-2 rounded-full border border-cream-200 bg-white/90 p-1.5 pl-5 shadow-lg shadow-stone-900/10 backdrop-blur transition focus-within:border-sage-400 focus-within:ring-4 focus-within:ring-sage-200/60 dark:border-stone-800 dark:bg-stone-900 dark:focus-within:border-sage-600 dark:focus-within:ring-sage-900/60">
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
            className="group flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage-600 to-sage-700 text-white shadow-md shadow-sage-900/20 transition hover:scale-105 active:scale-95 disabled:shadow-none disabled:bg-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 disabled:cursor-not-allowed disabled:bg-stone-300 dark:hover:bg-sage-500 dark:disabled:bg-stone-700"
          >
            <span className="sr-only">Envoyer</span>
            <ArrowUpIcon className="size-5 transition group-hover:-translate-y-0.5 group-disabled:translate-y-0" />
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

const PROMISES = ["Sources toujours citées", "Uniquement votre documentation", "Le dit quand il ne sait pas"];

/** Welcome hero, shown until the first question; it gives way to the conversation. */
function EmptyState({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-7 pt-4 text-center sm:pt-10">
      <h2 className="max-w-xl animate-fade-up font-display text-4xl leading-[1.1] font-semibold tracking-tight text-stone-900 sm:text-5xl dark:text-cream-50">
        Vos documents ont{" "}
        <span className="relative inline-block italic text-sage-700 dark:text-sage-300">
          réponse
          <svg
            aria-hidden
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
            className="absolute -bottom-2 left-0 h-3 w-full text-clay-400"
          >
            <path
              d="M3 14 C 40 4, 80 4, 110 11 S 170 18, 197 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              className="animate-draw"
            />
          </svg>
        </span>{" "}
        à tout.
      </h2>
      <p
        className="max-w-md animate-fade-up text-stone-600 dark:text-stone-400"
        style={{ animationDelay: "120ms" }}
      >
        Posez votre question : DocBot cherche dans la documentation de l&apos;entreprise et vous
        répond en citant ses sources.
      </p>
      <ul aria-label="Engagements" className="flex flex-wrap justify-center gap-2">
        {PROMISES.map((promise, i) => (
          <li
            key={promise}
            className="inline-flex animate-fade-in items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-stone-600 ring-1 ring-cream-200 backdrop-blur dark:bg-stone-900/60 dark:text-stone-300 dark:ring-stone-800"
            style={{ animationDelay: `${250 + i * 90}ms` }}
          >
            <span aria-hidden className="size-1.5 rounded-full bg-clay-400" />
            {promise}
          </li>
        ))}
      </ul>
      <div className="flex w-full flex-col items-center gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
          Essayez par exemple
        </p>
        <ul aria-label="Exemples de questions" className="flex flex-wrap justify-center gap-2.5">
          {EXAMPLE_QUESTIONS.map((example, i) => (
            <li key={example} className="animate-pop-in" style={{ animationDelay: `${450 + i * 110}ms` }}>
              <button
                type="button"
                onClick={() => onPick(example)}
                className="group inline-flex items-center gap-2 rounded-2xl border border-cream-200 bg-white/80 px-4 py-2.5 text-sm text-stone-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-sage-300 hover:text-sage-800 hover:shadow-md dark:border-stone-800 dark:bg-stone-900/80 dark:text-stone-200 dark:hover:border-sage-700 dark:hover:text-sage-200"
              >
                {example}
                <ArrowRightIcon className="size-4 text-clay-400 transition group-hover:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="flex flex-col gap-2 border-t border-cream-200 pt-3 dark:border-stone-800">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">Sources</p>
      <ul aria-label="Sources" className="flex flex-col gap-2">
        {sources.map((source, i) => (
          <li key={source.ref} className="animate-fade-up" style={{ animationDelay: `${200 + i * 90}ms` }}>
            <details className="group rounded-2xl border border-cream-200 bg-cream-50 text-sm transition hover:border-sage-200 open:border-sage-200 open:bg-sage-50/60 dark:border-stone-800 dark:bg-stone-950 dark:hover:border-sage-800 dark:open:border-sage-800 dark:open:bg-stone-950">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-3 py-2 text-stone-700 hover:text-sage-800 focus-visible:outline-2 focus-visible:outline-sage-500 dark:text-stone-200 dark:hover:text-sage-200 [&::-webkit-details-marker]:hidden">
                <CitationBadge refNumber={source.ref} />{" "}
                <span className="min-w-0 flex-1 truncate font-medium">{source.documentTitle}</span>
                <ChevronDownIcon className="size-4 shrink-0 text-stone-400 transition group-open:rotate-180" />
              </summary>
              <p className="mx-3 mb-3 animate-fade-in border-l-2 border-clay-300 pl-3 leading-relaxed text-stone-600 dark:border-sage-700 dark:text-stone-400">
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
    <div className="flex animate-fade-up items-center gap-3">
      <BotAvatar />
      <p className="flex items-center gap-2 rounded-3xl rounded-tl-md border border-cream-200 bg-white/90 px-4 py-2.5 text-sm text-stone-500 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
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
