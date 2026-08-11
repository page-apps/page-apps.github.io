# Personal Hub agent guide

This repository owns the hub catalogue and hub UI only.

- `data/apps.json` is the canonical registry of child applications.
- Child application source and data remain in their own repositories.
- Do not copy or rewrite child application data into this repository.
- Parent maintenance scripts must not mutate child repositories implicitly.
- New child entries need an id, title, description, repository, Pages URL, status, tags and capabilities.
- Keep app actions explicit and narrow; a rebuild should dispatch a named child workflow rather than grant broad repository write access.
