import { expect, test } from "@playwright/test";

function adminCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set for e2e tests");
  return { email, password };
}

test("admin pages are protected, login and logout work", async ({ page }) => {
  const { email, password } = adminCredentials();

  // Anonymous visitors are sent to the login page.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);

  // Wrong password: generic error, still on the login page.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Se connecter" }).click();
  // (Next.js renders its own role="alert" route announcer, hence the text filter.)
  await expect(
    page.getByRole("alert").filter({ hasText: "Email ou mot de passe incorrect." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);

  // The email is kept after a failed attempt (React resets forms after an action).
  await expect(page.getByLabel("Email")).toHaveValue(email);

  // Right credentials: dashboard.
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();

  // Logged-in admins are sent away from the login page.
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin$/);

  // Logout clears the session.
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
