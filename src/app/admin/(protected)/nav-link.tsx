"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Admin navigation link, highlighted on its own section (and its sub-pages). */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 transition ${
        active
          ? "bg-sage-100 font-medium text-sage-800 dark:bg-sage-900 dark:text-sage-100"
          : "text-stone-600 hover:bg-cream-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100"
      }`}
    >
      {children}
    </Link>
  );
}
