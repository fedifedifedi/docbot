import { splitCitations } from "@/lib/chat/segments";

/** Citation number as a badge; the brackets stay in the text for screen readers and copy-paste. */
export function CitationBadge({ refNumber }: { refNumber: number }) {
  return (
    <span className="mx-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-sage-100 px-1.5 align-[0.1em] text-[0.7rem] font-semibold leading-5 text-sage-800 dark:bg-sage-900 dark:text-sage-200">
      <span className="sr-only">[</span>
      {refNumber}
      <span className="sr-only">]</span>
    </span>
  );
}

/** Answer text with its [n] citations rendered as badges. */
export function AnswerText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {splitCitations(text).map((segment, i) =>
        segment.type === "text"
          ? segment.text
          : segment.refs.map((ref, j) => <CitationBadge key={`${i}-${j}`} refNumber={ref} />),
      )}
    </p>
  );
}
