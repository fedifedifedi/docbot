import { expect, test } from "@playwright/test";
import { loginAsAdmin, uniqueId } from "./helpers";

const NOT_FOUND = "Je ne trouve pas cette information dans la documentation.";

/** SPEC §5 steps 1–5: the admin adds a document, a visitor gets a sourced answer, then a refusal. */
test("public chat answers from the documentation with sources, and refuses otherwise", async ({
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
