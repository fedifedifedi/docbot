import { expect, test } from "@playwright/test";
import { loginAsAdmin, uniqueId } from "./helpers";

test("admin adds, inspects and deletes documents", async ({ page }) => {
  const id = uniqueId();
  const pastedTitle = `Horaires ${id}`;
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Documents" }).first().click();
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();

  // Pasted text.
  await page.getByLabel("Titre").fill(pastedTitle);
  await page.getByLabel("Texte").fill(
    "Le support est ouvert du lundi au vendredi de 9h à 18h.\n\nIl est fermé le week-end.",
  );
  await page.getByRole("button", { name: "Ajouter le document" }).click();
  await expect(page.getByRole("status")).toHaveText(`« ${pastedTitle} » ajouté (1 chunk).`);
  const pastedRow = page.getByRole("row", { name: new RegExp(pastedTitle) });
  await expect(pastedRow).toContainText("Texte collé");
  await expect(pastedRow).toContainText("1");

  // Markdown file, title defaults to the file name.
  await page.getByLabel(/fichier \.txt/).setInputFiles({
    name: `tarifs-${id}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from("# Tarifs\n\nLe forfait de base coûte 49 € par mois.\n\n## Options\n\nSupport prioritaire : 20 €."),
  });
  await page.getByRole("button", { name: "Ajouter le document" }).click();
  await expect(page.getByRole("status")).toHaveText(`« tarifs ${id} » ajouté (2 chunks).`);

  // Unsupported file type is refused.
  await page.getByLabel(/fichier \.txt/).setInputFiles({
    name: "contrat.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7"),
  });
  await page.getByRole("button", { name: "Ajouter le document" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Seuls les fichiers .txt et .md sont acceptés." }),
  ).toBeVisible();

  // Detail page shows the chunks.
  await page.getByRole("link", { name: `tarifs ${id}` }).click();
  await expect(page.getByRole("heading", { name: `tarifs ${id}` })).toBeVisible();
  await expect(page.getByText("Chunk 1")).toBeVisible();
  await expect(page.getByText("Le forfait de base coûte 49 € par mois.")).toBeVisible();

  // Delete from the detail page (confirmation dialog), back to the list.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Supprimer tarifs ${id}` }).click();
  await expect(page).toHaveURL(/\/admin\/documents$/);
  await expect(page.getByRole("link", { name: `tarifs ${id}` })).toHaveCount(0);

  // Cancelling the confirmation keeps the document.
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: `Supprimer ${pastedTitle}` }).click();
  await expect(pastedRow).toBeVisible();

  // Delete from the list.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Supprimer ${pastedTitle}` }).click();
  await expect(page.getByRole("row", { name: new RegExp(pastedTitle) })).toHaveCount(0);
});
