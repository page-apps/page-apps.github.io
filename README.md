# Personal Hub

Personal Hub is the catalogue and control plane for independent GitHub Pages applications.

It owns the app registry in `data/apps.json` and manages the optional shared browser credential. Each registered application owns its own repository, canonical data, tests, Actions workflow and Pages deployment. The hub must not become the canonical data store for child apps.

## Shared PAT setup

The deployed hub can verify and save one fine-grained GitHub personal access token for supported apps on `page-apps.github.io`:

1. Open **Set up shared PAT**.
2. Create a fine-grained PAT owned by `page-apps`, select `quick-log`, `bookmarks`, and the private Loam graph when applicable, then grant only **Contents: read and write**.
3. Paste it into the hub. The hub verifies the GitHub account plus write access to `page-apps/quick-log` and `page-apps/bookmarks` before saving.
4. Open Quick Log, Bookmark Garden, or Loam and explicitly choose **Use shared credential** or **Use shared PAT**. Every app verifies its own target repository.

The credential uses the framework-owned `repo-apps:credentials:v1` envelope in same-origin `localStorage`. It is never added to source, URLs, GitHub Actions, or the static build. Removing it from the hub removes it for all apps; disconnecting one app does not remove the shared credential.

This is a trusted-personal-device convenience, not origin isolation. Every application script under `page-apps.github.io` can technically read the same `localStorage`, and one shared token can write every repository selected for it. A compromised app or dependency therefore has a wider blast radius. Prefer dedicated app tokens or separate origins for higher-sensitivity data.

A fine-grained PAT has one resource owner. One token can cover the current Page Apps repositories only when the private Loam graph is also owned by `page-apps`; a graph owned by another account requires another token.

## Local development

```sh
pnpm install
pnpm dev
pnpm build
```

Update `data/apps.json` when adding an app. The shared credential contract is independent of the registry: new apps must implement explicit opt-in and repository-specific access verification before using it.
