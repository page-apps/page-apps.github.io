# Personal Hub

Personal Hub is the catalogue and control plane for independent GitHub Pages applications.

It owns the app registry in `data/apps.json` and manages the optional shared browser credential. Each registered application owns its own repository, canonical data, tests, Actions workflow and Pages deployment. The hub must not become the canonical data store for child apps.

## Shared PAT setup

The deployed hub can verify and save one fine-grained GitHub personal access token for supported apps on `page-apps.github.io`:

1. Open **Set up shared PAT**.
2. Create a fine-grained PAT owned by `page-apps`, select `quick-log`, `bookmarks`, `ai-kol-insights-data`, `tool-radar-data`, and the private Loam graph when applicable, then grant only **Contents: read and write**.
3. Paste it into the hub. The hub verifies the GitHub account and the required repository access, including read access to the private AI Field Notes and Tool Radar data repositories, before saving.
4. Open Quick Log, Bookmark Garden, AI Field Notes, Tool Radar, or Loam once. The app automatically reuses the saved shared PAT on later loads and still verifies its own target repository. You can disconnect the app for the current tab or choose a different credential at any time.

The credential uses the framework-owned `repo-apps:credentials:v1` envelope in same-origin `localStorage`. It is never added to source, URLs, GitHub Actions, or the static build. Removing it from the hub removes it for all apps; disconnecting one app does not remove the shared credential.

This is a trusted-personal-device convenience, not origin isolation. Every application script under `page-apps.github.io` can technically read the same `localStorage`, and one shared token can write every repository selected for it. A compromised app or dependency therefore has a wider blast radius. Prefer dedicated app tokens or separate origins for higher-sensitivity data.

A fine-grained PAT has one resource owner. One token can cover the current Page Apps repositories only when the private Loam graph is also owned by `page-apps`; a graph owned by another account requires another token.

## Local development

```sh
pnpm install
pnpm dev
pnpm build
```

Update `data/apps.json` when adding an app. The shared credential contract is independent of the registry: new apps must implement a clear first-use disclosure, automatic reuse only after that initial app connection, and repository-specific access verification before using it.

## Theme and Web Relay

The hub defaults to dark. **Use light theme / Use dark theme** saves a browser-local preference separately from credentials. If storage is unavailable, the choice works for the current page.

The browser bundle uses the published `@web-relay/sdk@0.1.3`. Provider `personal-hub` owns commands to switch theme, open each registered application in the current tab, and open the existing shared PAT dialog. Web Relay receives public command descriptors and action results only. It cannot read, save, or remove a credential. Opening the dialog makes the setup and navigation commands unavailable until it closes. The local theme and setup buttons execute the same registry commands. The integration disposes on page exit and remounts after a persisted back/forward restore.

Pair this origin in your Web Relay launcher, following the [PWA guide](https://web-relay.github.io/guides/pwa/). In `apps/launcher-extension/src/providers.ts`, preserve existing entries and add:

```ts
{ providerId: 'personal-hub', name: 'Personal Hub', origins: ['https://page-apps.github.io'] },
```

Add `https://page-apps.github.io/*` to both `host_permissions` and the existing bridge's `content_scripts[0].matches` in the launcher manifest. Rebuild the launcher with `pnpm build`, reload the extension, then reload the hub tab. For local testing, explicitly add `http://127.0.0.1:4326` to this provider's origins and `http://127.0.0.1/*` to those manifest lists. Origins have no path or trailing slash. Use only one provider identity per origin; the launcher chooses its first match. All Pages apps share this origin, but each page must register its own commands with the configured provider identity before the launcher can use them.

Installing the SDK or deploying the hub does not change your installed extension's pairing. The hub remains usable without it. `pnpm test:e2e` verifies the theme, bridge discovery, execution, stale availability, and rejection of messages from other windows/origins, alongside the credential journey.
