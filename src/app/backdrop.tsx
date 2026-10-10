/** Decorative background: slowly drifting colour blobs and a paper grain. */
export function Backdrop({ subtle = false }: { subtle?: boolean }) {
  const strength = subtle ? "opacity-40 dark:opacity-25" : "opacity-70 dark:opacity-40";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className={strength}>
        <div className="blob absolute -top-32 -left-24 size-[28rem] rounded-full bg-sage-200 blur-3xl dark:bg-sage-800" />
        <div
          className="blob absolute top-1/3 -right-32 size-[26rem] rounded-full bg-clay-100 blur-3xl dark:bg-clay-700/60"
          style={{ animationDelay: "-7s" }}
        />
        <div
          className="blob absolute -bottom-40 left-1/4 size-[30rem] rounded-full bg-cream-200 blur-3xl dark:bg-stone-800"
          style={{ animationDelay: "-14s" }}
        />
      </div>
      <div className="grain absolute inset-0 opacity-[0.06] mix-blend-multiply dark:opacity-[0.05] dark:mix-blend-screen" />
    </div>
  );
}
