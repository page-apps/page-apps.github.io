# Personal Hub

Personal Hub is the catalogue and control plane for independent GitHub Pages applications.

It owns the app registry in `data/apps.json`. Each registered application owns its own repository, canonical data, tests, Actions workflow and Pages deployment. The hub links to those applications and may later show deployment status or dispatch an explicit rebuild workflow; it must not become the canonical data store for child apps.

## Local development

```sh
pnpm install
pnpm dev
pnpm build
```

The initial registry contains [`page-apps/quick-log`](https://github.com/page-apps/quick-log). Update `data/apps.json` when adding an app.
