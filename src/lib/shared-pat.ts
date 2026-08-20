export const SHARED_CREDENTIAL_KEY = "repo-apps:credentials:v1";

const HUB_APP_ID = "page-apps-hub";
const GITHUB_API_VERSION = "2022-11-28";
const REQUIRED_REPOSITORIES = [
  { repository: "page-apps/quick-log", access: "write" },
  { repository: "page-apps/bookmarks", access: "write" },
  { repository: "page-apps/todo-list-plugin", access: "read" },
  { repository: "page-apps/todo-list-data", access: "write" },
  { repository: "page-apps/ai-kol-insights-data", access: "read" },
] as const;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SharedCredentialEnvelope {
  version: 1;
  scope: "shared";
  credential: {
    kind: "pat";
    token: string;
    createdAt: string;
    account?: string;
  };
  apps: Record<string, {
    connectedAt: string;
    repositoryHint?: string;
  }>;
}

export interface SharedPatSummary {
  account?: string;
  createdAt: string;
  connectedApps: string[];
}

export interface SharedPatSetupResult extends SharedPatSummary {
  verifiedRepositories: string[];
}

export interface SharedPatSetupOptions {
  fetcher?: typeof fetch;
  now?: () => Date;
  storage?: StorageLike;
}

function browserStorage(): StorageLike {
  if (typeof localStorage === "undefined") {
    throw new Error("Shared credential storage is only available in a browser.");
  }

  return localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeEnvelope(raw: string | null): SharedCredentialEnvelope | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || parsed.scope !== "shared") return null;
    if (!isRecord(parsed.credential) || parsed.credential.kind !== "pat") return null;
    if (typeof parsed.credential.token !== "string" || !parsed.credential.token.trim()) return null;
    if (typeof parsed.credential.createdAt !== "string") return null;
    if (!isRecord(parsed.apps)) return null;

    const apps: SharedCredentialEnvelope["apps"] = {};
    for (const [appId, value] of Object.entries(parsed.apps)) {
      if (!isRecord(value) || typeof value.connectedAt !== "string") continue;
      apps[appId] = {
        connectedAt: value.connectedAt,
        ...(typeof value.repositoryHint === "string"
          ? { repositoryHint: value.repositoryHint }
          : {}),
      };
    }

    return {
      version: 1,
      scope: "shared",
      credential: {
        kind: "pat",
        token: parsed.credential.token.trim(),
        createdAt: parsed.credential.createdAt,
        ...(typeof parsed.credential.account === "string"
          ? { account: parsed.credential.account }
          : {}),
      },
      apps,
    };
  } catch {
    return null;
  }
}

function toSummary(envelope: SharedCredentialEnvelope): SharedPatSummary {
  return {
    ...(envelope.credential.account ? { account: envelope.credential.account } : {}),
    createdAt: envelope.credential.createdAt,
    connectedApps: Object.keys(envelope.apps).sort(),
  };
}

function headers(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

async function githubRequest(
  path: string,
  token: string,
  fetcher: typeof fetch,
): Promise<Record<string, unknown>> {
  const response = await fetcher(`https://api.github.com${path}`, {
    cache: "no-store",
    credentials: "omit",
    headers: headers(token),
    referrerPolicy: "no-referrer",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("GitHub rejected this token. Check that it is active and copied completely.");
    }
    if (response.status === 403) {
      throw new Error("GitHub denied the request. Check the token owner, expiry, and repository permissions.");
    }
    throw new Error(`GitHub verification failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error("GitHub returned an unexpected response.");
  return payload;
}

function canWriteRepository(payload: Record<string, unknown>): boolean {
  if (!isRecord(payload.permissions)) return false;
  return payload.permissions.push === true
    || payload.permissions.admin === true
    || payload.permissions.maintain === true;
}

function canReadRepository(payload: Record<string, unknown>): boolean {
  if (!isRecord(payload.permissions)) return false;
  return payload.permissions.pull === true || canWriteRepository(payload);
}

export function readSharedPatSummary(storage: StorageLike = browserStorage()): SharedPatSummary | null {
  const envelope = decodeEnvelope(storage.getItem(SHARED_CREDENTIAL_KEY));
  return envelope ? toSummary(envelope) : null;
}

export async function setupSharedPat(
  rawToken: string,
  options: SharedPatSetupOptions = {},
): Promise<SharedPatSetupResult> {
  const token = rawToken.trim();
  if (!token || /\s/.test(token)) {
    throw new Error("Enter a GitHub personal access token without spaces.");
  }

  const fetcher = options.fetcher ?? fetch;
  const storage = options.storage ?? browserStorage();
  const now = options.now ?? (() => new Date());
  const accountPayload = await githubRequest("/user", token, fetcher);
  if (typeof accountPayload.login !== "string" || !accountPayload.login) {
    throw new Error("GitHub did not return an account for this token.");
  }

  for (const requirement of REQUIRED_REPOSITORIES) {
    const payload = await githubRequest(`/repos/${requirement.repository}`, token, fetcher);
    const allowed = requirement.access === "write" ? canWriteRepository(payload) : canReadRepository(payload);
    if (!allowed) {
      throw new Error(`This token does not have Contents ${requirement.access} access to ${requirement.repository}.`);
    }
  }

  const timestamp = now().toISOString();
  const existing = decodeEnvelope(storage.getItem(SHARED_CREDENTIAL_KEY));
  const envelope: SharedCredentialEnvelope = {
    version: 1,
    scope: "shared",
    credential: {
      kind: "pat",
      token,
      createdAt: timestamp,
      account: accountPayload.login,
    },
    apps: {
      ...(existing?.apps ?? {}),
      [HUB_APP_ID]: { connectedAt: timestamp },
    },
  };

  storage.setItem(SHARED_CREDENTIAL_KEY, JSON.stringify(envelope));
  return {
    ...toSummary(envelope),
    verifiedRepositories: REQUIRED_REPOSITORIES.map(({ repository }) => repository),
  };
}

export function removeSharedPat(storage: StorageLike = browserStorage()): void {
  storage.removeItem(SHARED_CREDENTIAL_KEY);
}
