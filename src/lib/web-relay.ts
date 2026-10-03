import { createLauncher } from "@web-relay/sdk";

interface HubActions {
  apps: readonly { id: string; title: string; pagesUrl: string }[];
  dialogOpen: () => boolean;
  openCredentials: () => void;
  toggleTheme: () => "dark" | "light";
}

let active: ReturnType<typeof createLauncher<{ dialogOpen: boolean }>> | undefined;

/** The bridge only exposes public catalogue actions, never the credential vault. */
export function mountHubRelay(actions: HubActions) {
  active?.dispose();
  const launcher = createLauncher({
    providerId: "personal-hub",
    context: () => ({ dialogOpen: actions.dialogOpen() }),
  });
  launcher.registry.register({
    id: "personal-hub.toggle-theme",
    title: "Switch hub theme",
    run: () => ({ theme: actions.toggleTheme() }),
  });
  launcher.registry.register({
    id: "personal-hub.manage-credentials",
    title: "Open shared PAT setup",
    description: "Open the hub's existing setup dialog. No credential is shared with Web Relay.",
    when: ({ dialogOpen }) => !dialogOpen,
    run: () => {
      actions.openCredentials();
      return { message: "Opened shared PAT setup." };
    },
  });
  for (const app of actions.apps) {
    launcher.registry.register({
      id: `personal-hub.open.${app.id}`,
      title: `Open ${app.title}`,
      when: ({ dialogOpen }) => !dialogOpen,
      run: () => {
        // Let the bridge reply before navigating the owning tab.
        window.setTimeout(() => window.location.assign(app.pagesUrl), 0);
        return { message: `Opening ${app.title}.` };
      },
    });
  }
  active = launcher;
  return launcher;
}
