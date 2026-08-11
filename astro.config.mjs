import { defineConfig } from "astro/config";

const [owner = "page-apps", repository = "page-apps.github.io"] = (
  process.env.GITHUB_REPOSITORY ?? "page-apps/page-apps.github.io"
).split("/");
const isOwnerSite = repository === `${owner}.github.io`;

export default defineConfig({
  output: "static",
  site: `https://${owner}.github.io`,
  base: process.env.GITHUB_ACTIONS === "true" && !isOwnerSite ? `/${repository}` : "/",
});
