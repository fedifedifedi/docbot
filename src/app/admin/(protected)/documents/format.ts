const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

export function sourceLabel(source: "PASTE" | "FILE", filename: string | null): string {
  return source === "FILE" ? `Fichier${filename ? ` (${filename})` : ""}` : "Texte collé";
}
