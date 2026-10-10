/** Shared Tailwind classes of the admin UI (warm palette, same as the public chat). */

export const card =
  "rounded-3xl border border-cream-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900";

export const label = "flex flex-col gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200";

export const field =
  "rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 font-normal text-stone-800 placeholder:text-stone-400 transition focus:border-sage-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sage-200/60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-sage-600 dark:focus:bg-stone-950 dark:focus:ring-sage-900/60";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-sage-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sage-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-sage-500";

export const alertBox =
  "flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";

export const successBox =
  "flex items-start gap-2 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-sage-800 dark:border-sage-800 dark:bg-sage-950 dark:text-sage-200";

export const pill =
  "inline-flex items-center gap-1 rounded-full bg-cream-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300";

export const backLink =
  "inline-flex items-center gap-1.5 self-start rounded-full text-sm text-stone-500 transition hover:text-sage-700 dark:text-stone-400 dark:hover:text-sage-300";

/** Table inside a card: header row and body rows. */
export const table = {
  // `relative`: keeps absolutely positioned children (sr-only labels) inside the scroll box,
  // otherwise they widen the whole page on mobile.
  wrapper: `${card} relative overflow-x-auto`,
  table: "w-full text-left text-sm",
  head: "border-b border-cream-200 bg-cream-100/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-400",
  th: "px-4 py-3 font-medium",
  row: "border-b border-cream-100 transition last:border-0 hover:bg-cream-50 dark:border-stone-800 dark:hover:bg-stone-950/40",
  td: "px-4 py-3",
};
