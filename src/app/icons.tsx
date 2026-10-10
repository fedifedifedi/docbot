/** Inline icons (Heroicons paths), decorative: always aria-hidden. */

type IconProps = { className?: string };

function Outline({ d, className = "size-5" }: IconProps & { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Solid({ d, className = "size-5" }: IconProps & { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d={d} />
    </svg>
  );
}

export const BookIcon = (p: IconProps) => (
  <Outline
    {...p}
    d="M12 6.04A8.97 8.97 0 0 0 6 3.75c-1.05 0-2.06.18-3 .51v14.25A8.99 8.99 0 0 1 6 18c2.3 0 4.4.87 6 2.29m0-14.25a8.97 8.97 0 0 1 6-2.29c1.05 0 2.06.18 3 .51v14.25A8.99 8.99 0 0 0 18 18a8.97 8.97 0 0 0-6 2.29m0-14.25v14.25"
  />
);

export const DocumentIcon = (p: IconProps) => (
  <Outline
    {...p}
    d="M19.5 14.25v-2.63a3.38 3.38 0 0 0-3.38-3.37h-1.5a1.13 1.13 0 0 1-1.12-1.13v-1.5A3.38 3.38 0 0 0 10.13 2.25H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.63c-.62 0-1.13.5-1.13 1.13v17.25c0 .62.5 1.12 1.13 1.12h12.75c.62 0 1.12-.5 1.12-1.12V11.25a9 9 0 0 0-9-9Z"
  />
);

export const ChatIcon = (p: IconProps) => (
  <Outline
    {...p}
    d="M20.25 8.51c.88.28 1.5 1.12 1.5 2.08v4.29c0 1.14-.85 2.1-1.98 2.19-.34.03-.68.05-1.02.07v3.1l-3-3c-1.35 0-2.7-.06-4.02-.16a2.12 2.12 0 0 1-.83-.24m9.35-8.33a2.13 2.13 0 0 0-.47-.1 48.4 48.4 0 0 0-8.05 0c-1.13.1-1.98 1.05-1.98 2.19v4.29c0 .84.46 1.58 1.15 1.95m9.35-8.33V6.64c0-1.62-1.15-3.03-2.76-3.24A48.4 48.4 0 0 0 11.25 3c-2.12 0-4.2.14-6.24.4-1.6.21-2.76 1.62-2.76 3.24v6.24c0 1.62 1.15 3.03 2.76 3.24.58.08 1.16.14 1.74.19V21l4.16-4.16"
  />
);

export const PuzzleIcon = (p: IconProps) => (
  <Outline
    {...p}
    d="M6.43 9.75 2.25 12l4.18 2.25m0-4.5 5.57 3 5.57-3m-11.14 0L2.25 7.5 12 2.25l9.75 5.25-4.18 2.25m0 0L21.75 12l-4.18 2.25m0 0 4.18 2.25L12 21.75 2.25 16.5l4.18-2.25m11.14 0-5.57 3-5.57-3"
  />
);

export const ArrowUpIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M10 17a.75.75 0 0 1-.75-.75V5.61L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.16v10.64A.75.75 0 0 1 10 17Z"
  />
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M17 10a.75.75 0 0 1-.75.75H5.61l4.16 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.61 9.25h10.64A.75.75 0 0 1 17 10Z"
  />
);

export const ArrowRightIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M3 10a.75.75 0 0 1 .75-.75h10.64l-4.16-3.96a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.16-3.96H3.75A.75.75 0 0 1 3 10Z"
  />
);

export const ChevronDownIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
  />
);

export const RefreshIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M15.31 11.42a5.5 5.5 0 0 1-9.2 2.47l-.31-.31h2.43a.75.75 0 0 0 0-1.5H3.99a.75.75 0 0 0-.75.75v4.24a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.71-3.14.75.75 0 0 0-1.45-.39Zm1.23-3.72a.75.75 0 0 0 .22-.53V2.93a.75.75 0 0 0-1.5 0v2.43l-.31-.31A7 7 0 0 0 3.24 8.19a.75.75 0 1 0 1.45.39A5.5 5.5 0 0 1 13.89 6.1l.31.31h-2.43a.75.75 0 0 0 0 1.5h4.24a.75.75 0 0 0 .53-.21Z"
  />
);

export const TrashIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.44c-.8.08-1.58.17-2.36.29a.75.75 0 0 0 .22 1.48l.15-.02.85 10.6A2.75 2.75 0 0 0 7.6 19h4.8a2.75 2.75 0 0 0 2.74-2.46l.85-10.6.15.02a.75.75 0 1 0 .22-1.48c-.78-.12-1.57-.21-2.36-.29v-.44A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.67.03 2.5.08v-.33c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.33C8.33 4.03 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
  />
);

export const LogoutIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .41.34.75.75.75h5.5c.41 0 .75-.34.75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Zm16 5.75a.75.75 0 0 1-.75.75H8.81l1.24 1.16a.75.75 0 1 1-1.02 1.1l-2.5-2.33a.75.75 0 0 1 0-1.1l2.5-2.32a.75.75 0 0 1 1.02 1.1L8.81 9.25h9.44A.75.75 0 0 1 19 10Z"
  />
);

export const ExternalIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .41.34.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm6.5-2.75A.75.75 0 0 1 11.5 2h5.75a.75.75 0 0 1 .75.75v5.75a.75.75 0 0 1-1.5 0V4.56l-6.22 6.22a.75.75 0 1 1-1.06-1.06l6.22-6.22H11.5a.75.75 0 0 1-.75-.75Z"
  />
);

export const CheckIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.81a.75.75 0 0 0-1.22-.88l-3.24 4.53-1.62-1.62a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.09l3.75-5.25Z"
  />
);

export const AlertIcon = (p: IconProps) => (
  <Solid
    {...p}
    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
  />
);

/** Round avatar next to DocBot's answers. */
export function BotAvatar() {
  return (
    <span
      aria-hidden
      className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-200"
    >
      <BookIcon className="size-4" />
    </span>
  );
}

/** The DocBot mark: book icon on a sage tile. */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = { sm: "size-8 rounded-xl", md: "size-10 rounded-xl", lg: "size-14 rounded-2xl" }[size];
  const icon = { sm: "size-4", md: "size-5", lg: "size-7" }[size];
  return (
    <span
      aria-hidden
      className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-sage-500 to-sage-700 text-white shadow-lg shadow-sage-900/20 ${box}`}
    >
      <BookIcon className={icon} />
      <span className="absolute -top-0.5 -right-0.5 size-[28%] rounded-full bg-clay-400 ring-2 ring-cream-50 dark:ring-stone-950" />
    </span>
  );
}
