import { expect, test, type Page } from "@playwright/test";

async function request(page: Page, type: "discover" | "execute", capabilityId?: string) {
  return page.evaluate(({ type, capabilityId }) => new Promise<any>((resolve) => {
    const requestId = crypto.randomUUID();
    const listener = (event: MessageEvent) => {
      if (event.data?.source !== "web-relay:pwa" || event.data.message.requestId !== requestId) return;
      window.removeEventListener("message", listener);
      resolve(event.data.message);
    };
    window.addEventListener("message", listener);
    window.postMessage({ source: "web-relay:extension", message: {
      channel: "web-relay", version: 1, requestId, type, capabilityId,
    } }, location.origin);
  }), { type, capabilityId });
}

test("dark is default; local and relay theme changes persist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Use light theme" })).toBeVisible();
  expect(await page.locator("html").evaluate((node) => getComputedStyle(node).colorScheme)).toBe("dark");
  await page.getByRole("button", { name: "Use light theme" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Use dark theme" })).toBeVisible();
  expect(await request(page, "execute", "personal-hub.toggle-theme")).toMatchObject({ ok: true, data: { theme: "dark" } });
  await page.reload();
  await expect(page.getByRole("button", { name: "Use light theme" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("relay discovers public actions, rechecks modal state, and never returns secrets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Use light theme" })).toBeVisible();
  const discovery = await request(page, "discover");
  expect(discovery.ok).toBe(true);
  expect(discovery.data).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "personal-hub.toggle-theme", providerId: "personal-hub", providerKind: "pwa" }),
    expect.objectContaining({ id: "personal-hub.manage-credentials" }),
    expect.objectContaining({ id: "personal-hub.open.quick-log" }),
  ]));
  await page.evaluate(() => localStorage.setItem("repo-apps:credentials:v1", "secret-fixture-never-return"));
  await request(page, "execute", "personal-hub.manage-credentials");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Personal access token", { exact: true }).fill("private-input-fixture");
  const unavailable = await request(page, "execute", "personal-hub.manage-credentials");
  expect(unavailable).toMatchObject({ ok: false, error: { code: "UNAVAILABLE" } });
  const whileOpen = await request(page, "discover");
  expect(whileOpen.data.map((action: { id: string }) => action.id)).toEqual(["personal-hub.toggle-theme"]);
  expect(JSON.stringify([discovery, unavailable, whileOpen])).not.toMatch(/secret-fixture|private-input/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await request(page, "execute", "personal-hub.missing")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
});

test("bridge ignores messages from a different origin or window", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Use light theme" })).toBeVisible();
  const responses = await page.evaluate(async () => {
    let replies = 0;
    const listener = (event: MessageEvent) => {
      if (event.data?.source === "web-relay:pwa") replies++;
    };
    window.addEventListener("message", listener);
    const data = { source: "web-relay:extension", message: {
      channel: "web-relay", version: 1, requestId: "untrusted", type: "execute", capabilityId: "personal-hub.toggle-theme",
    } };
    window.dispatchEvent(new MessageEvent("message", { source: window, origin: "https://unconfigured.example", data }));
    window.dispatchEvent(new MessageEvent("message", { origin: location.origin, data }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    window.removeEventListener("message", listener);
    return replies;
  });
  expect(responses).toBe(0);
  await expect(page.getByRole("button", { name: "Use light theme" })).toBeVisible();
});

test("relay opens a registered application in the owning tab", async ({ page }) => {
  await page.route("https://page-apps.github.io/quick-log/**", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Application navigation fixture</title>",
  }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Use light theme" })).toBeVisible();
  expect(await request(page, "execute", "personal-hub.open.quick-log")).toMatchObject({ ok: true });
  await page.waitForURL("https://page-apps.github.io/quick-log/");
});
