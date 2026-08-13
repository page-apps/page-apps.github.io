# Personal Hub agent guide

This repository owns the hub catalogue, hub UI, and the user-facing manager for the optional same-origin shared PAT.

- `data/apps.json` is the canonical registry of child applications.
- Child application source and data remain in their own repositories.
- Do not copy or rewrite child application data into this repository.
- Keep the shared credential compatible with `repo-apps:credentials:v1`; never put its token in logs, URLs, source, build output, Actions, registry data, or visible status summaries.
- Verify GitHub authentication and the hub's required repository writes before replacing the stored credential.
- Saving in the hub does not authorize a child app. Every child app must make its first-use choice clear, then may automatically reuse the approved credential on later loads while independently verifying access to its target repository.
- Removing the shared credential is global; disconnecting one child app must not remove it.
- Preserve the same-origin threat disclosure and the fine-grained PAT single-resource-owner limitation in the UI and documentation.
- Parent maintenance scripts must not mutate child repositories implicitly.
- New child entries need an id, title, description, repository, Pages URL, status, tags and capabilities.
- Keep app actions explicit and narrow; a rebuild should dispatch a named child workflow rather than grant broad repository write access.
