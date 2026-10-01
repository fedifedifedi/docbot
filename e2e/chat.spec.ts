import { expect, test } from "@playwright/test";
import { loginAsAdmin, uniqueId } from "./helpers";

const NOT_FOUND = "Je ne trouve pas cette information dans la documentation.";

/**
 * SPEC §5, full journey: the admin adds a document, a visitor gets a sourced answer then a
 * refusal, and the admin finds that conversation in the history.
 */
test("public chat answers from the documentation with sources, refuses otherwise, and is logged", async ({
  page,
  browser,
}) => {
  const id = uniqueId();
  // A made-up product name keeps this test independent from other documents in the database.
  const product = `Zorblax${id}`;
  const title = `Support ${product}`;

  // 1–3. Admin adds a document.
  await loginAsAdmin(page);
  await page.goto("/admin/documents");
  await page.getByLabel("Titre").fill(title);
  await page
    .getByLabel("Texte")
    .fill(`Les horaires du support ${product} sont de 9h à 18h du lundi au vendredi.`);
  await page.getByRole("button", { name: "Ajouter le document" }).click();
  await expect(page.getByRole("status")).toContainText(title);

  // 4. A visitor (separate, anonymous session) asks a question covered by the document.
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/");
  await visitor.getByLabel("Votre question").fill(`Quels sont les horaires du support ${product} ?`);
  await visitor.getByRole("button", { name: "Envoyer" }).click();

  const answers = visitor.getByRole("article", { name: "Réponse de DocBot" });
  await expect(answers).toHaveCount(1);
  await expect(answers.first()).toContainText("9h à 18h du lundi au vendredi");
  await expect(answers.first()).toContainText("[1]");
  const sources = answers.first().getByRole("list", { name: "Sources" });
  await expect(sources).toContainText(`[1] ${title}`);

  // 5. A question the documentation does not answer: the bot says so, with no source.
  await visitor.getByLabel("Votre question").fill("Quel est le prix du forfait entreprise ?");
  await visitor.getByRole("button", { name: "Envoyer" }).click();
  await expect(answers).toHaveCount(2);
  await expect(answers.nth(1)).toHaveText(NOT_FOUND);
  await expect(answers.nth(1).getByRole("list", { name: "Sources" })).toHaveCount(0);

  // 6. The admin finds the conversation in the history, with both exchanges and the source.
  await page.goto("/admin/conversations");
  await page.getByRole("link", { name: `Quels sont les horaires du support ${product} ?` }).click();
  await expect(page.getByRole("heading", { name: "Conversation" })).toBeVisible();
  const items = page.getByRole("listitem").filter({ hasText: /^(Visiteur|DocBot) ·/ });
  await expect(items).toHaveCount(4);
  await expect(page.getByRole("listitem", { name: "Question du visiteur" })).toHaveText([
    new RegExp(`Quels sont les horaires du support ${product}`),
    /Quel est le prix du forfait entreprise/,
  ]);
  const replies = page.getByRole("listitem", { name: "Réponse de DocBot" });
  await expect(replies.first()).toContainText("9h à 18h du lundi au vendredi");
  await expect(replies.first().getByRole("list", { name: "Sources" })).toContainText(title);
  await expect(replies.nth(1)).toContainText(NOT_FOUND);
  await expect(replies.nth(1).getByRole("list", { name: "Sources" })).toHaveCount(0);
});

test("chat API validates its input", async ({ request }) => {
  const empty = await request.post("/api/chat", { data: { question: "   " } });
  expect(empty.status()).toBe(400);

  const tooLong = await request.post("/api/chat", { data: { question: "x".repeat(1001) } });
  expect(tooLong.status()).toBe(400);

  const notJson = await request.post("/api/chat", {
    headers: { "content-type": "application/json" },
    data: "{oops",
  });
  expect(notJson.status()).toBe(400);
});
