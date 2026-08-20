import { describe, expect, it, vi } from "vitest";
import {
  readSharedPatSummary,
  removeSharedPat,
  setupSharedPat,
  SHARED_CREDENTIAL_KEY,
} from "../src/lib/shared-pat";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("shared PAT vault", () => {
  it("verifies the account and writable repositories before storing the compatible envelope", async () => {
    const storage = new MemoryStorage();
    storage.setItem(SHARED_CREDENTIAL_KEY, JSON.stringify({
      version: 1,
      scope: "shared",
      credential: {
        kind: "pat",
        token: "old-token",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      apps: {
        "quick-log": {
          connectedAt: "2026-01-02T00:00:00.000Z",
          repositoryHint: "page-apps/quick-log",
        },
      },
    }));
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ login: "cmwen" }))
      .mockResolvedValueOnce(jsonResponse({ permissions: { push: true } }))
      .mockResolvedValueOnce(jsonResponse({ permissions: { maintain: true } }))
      .mockResolvedValueOnce(jsonResponse({ permissions: { pull: true } }))
      .mockResolvedValueOnce(jsonResponse({ permissions: { push: true } }))
      .mockResolvedValueOnce(jsonResponse({ permissions: { pull: true } }));

    const result = await setupSharedPat(" github_pat_example ", {
      storage,
      fetcher,
      now: () => new Date("2026-08-12T00:00:00.000Z"),
    });

    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "https://api.github.com/user",
      "https://api.github.com/repos/page-apps/quick-log",
      "https://api.github.com/repos/page-apps/bookmarks",
      "https://api.github.com/repos/page-apps/todo-list-plugin",
      "https://api.github.com/repos/page-apps/todo-list-data",
      "https://api.github.com/repos/page-apps/ai-kol-insights-data",
    ]);
    expect(result).toEqual({
      account: "cmwen",
      createdAt: "2026-08-12T00:00:00.000Z",
      connectedApps: ["page-apps-hub", "quick-log"],
      verifiedRepositories: [
        "page-apps/quick-log",
        "page-apps/bookmarks",
        "page-apps/todo-list-plugin",
        "page-apps/todo-list-data",
        "page-apps/ai-kol-insights-data",
      ],
    });

    const stored = JSON.parse(storage.getItem(SHARED_CREDENTIAL_KEY) ?? "null");
    expect(stored.credential.token).toBe("github_pat_example");
    expect(stored.apps["quick-log"].repositoryHint).toBe("page-apps/quick-log");
    expect(readSharedPatSummary(storage)).toEqual({
      account: "cmwen",
      createdAt: "2026-08-12T00:00:00.000Z",
      connectedApps: ["page-apps-hub", "quick-log"],
    });
  });

  it("does not store a token without repository write access", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ login: "cmwen" }))
      .mockResolvedValueOnce(jsonResponse({ permissions: { push: false } }));

    await expect(setupSharedPat("github_pat_read_only", { storage, fetcher }))
      .rejects.toThrow("Contents write access to page-apps/quick-log");
    expect(storage.getItem(SHARED_CREDENTIAL_KEY)).toBeNull();
  });

  it("removes the shared vault without exposing its token through the summary", () => {
    const storage = new MemoryStorage();
    storage.setItem(SHARED_CREDENTIAL_KEY, JSON.stringify({
      version: 1,
      scope: "shared",
      credential: {
        kind: "pat",
        token: "secret-token",
        createdAt: "2026-08-12T00:00:00.000Z",
        account: "cmwen",
      },
      apps: {},
    }));

    expect(JSON.stringify(readSharedPatSummary(storage))).not.toContain("secret-token");
    removeSharedPat(storage);
    expect(readSharedPatSummary(storage)).toBeNull();
  });
});
