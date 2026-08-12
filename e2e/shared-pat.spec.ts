import { expect, test } from "@playwright/test";

test("verifies, saves, reports, and removes one shared PAT", async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
      if (!url.startsWith("https://api.github.com/")) return originalFetch(input, init);
      const body = url.endsWith("/user")
        ? { login: "cmwen" }
        : { permissions: { push: true } };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Set up shared PAT" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Set up your GitHub PAT" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Personal access token").fill("github_pat_hub_browser_test");
  await dialog.getByText("I understand that all apps").click();
  await dialog.getByRole("button", { name: "Verify and save" }).click();

  await expect(page.getByText("Ready for @cmwen")).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("repo-apps:credentials:v1") ?? "null")
  );
  expect(stored).toMatchObject({
    version: 1,
    scope: "shared",
    credential: { kind: "pat", token: "github_pat_hub_browser_test", account: "cmwen" },
    apps: { "page-apps-hub": {} },
  });

  page.once("dialog", (confirmation) => confirmation.accept());
  await page.getByRole("button", { name: "Remove shared PAT" }).click();
  await expect(page.getByText("Not configured")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("repo-apps:credentials:v1"))).toBeNull();
});
