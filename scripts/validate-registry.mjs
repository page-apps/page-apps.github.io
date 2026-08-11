import { readFile } from "node:fs/promises";

const registry = JSON.parse(await readFile(new URL("../data/apps.json", import.meta.url), "utf8"));
const allowedStatuses = new Set(["published", "building", "failed", "local"]);
const ids = new Set();

if (registry.schemaVersion !== 1 || !Array.isArray(registry.apps)) {
  throw new Error("data/apps.json must contain schemaVersion 1 and an apps array");
}

for (const [index, app] of registry.apps.entries()) {
  const label = `apps[${index}]`;
  for (const field of ["id", "title", "description", "repository", "pagesUrl", "status"]) {
    if (typeof app[field] !== "string" || app[field].trim() === "") {
      throw new Error(`${label}.${field} must be a non-empty string`);
    }
  }

  if (ids.has(app.id)) throw new Error(`${label}.id must be unique: ${app.id}`);
  ids.add(app.id);

  if (!/^[^/]+\/[^/]+$/.test(app.repository)) {
    throw new Error(`${label}.repository must use owner/repository form`);
  }

  const pagesUrl = new URL(app.pagesUrl);
  if (pagesUrl.protocol !== "https:") throw new Error(`${label}.pagesUrl must use HTTPS`);
  if (!allowedStatuses.has(app.status)) throw new Error(`${label}.status is not supported: ${app.status}`);
  if (!Array.isArray(app.tags) || !app.tags.every((tag) => typeof tag === "string")) {
    throw new Error(`${label}.tags must be an array of strings`);
  }
  if (!Array.isArray(app.capabilities) || !app.capabilities.every((capability) => typeof capability === "string")) {
    throw new Error(`${label}.capabilities must be an array of strings`);
  }
}

console.log(`Validated ${registry.apps.length} registered app${registry.apps.length === 1 ? "" : "s"}.`);
