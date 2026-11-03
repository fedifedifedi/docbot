import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The fictional imaging protocol used to evaluate search (one Markdown section = one topic). */
export const DEMO_DOCUMENT = {
  title: "Protocole d'imagerie de démonstration (fictif)",
  filename: "protocole-imagerie.md",
} as const;

export function readDemoDocument(): string {
  return readFileSync(join(__dirname, DEMO_DOCUMENT.filename), "utf8");
}
