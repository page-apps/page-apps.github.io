const storageKey = "personal-hub:theme";

function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#17121e" : "#f7f2f8");
  const button = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  if (button) {
    button.textContent = theme === "dark" ? "Use light theme" : "Use dark theme";
  }
}

export function initializeTheme(): void {
  let theme: "dark" | "light" = "dark";
  try {
    if (localStorage.getItem(storageKey) === "light") theme = "light";
  } catch { /* The theme still works when storage is blocked. */ }
  applyTheme(theme);
}

export function toggleTheme(): "dark" | "light" {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme);
  try { localStorage.setItem(storageKey, theme); } catch { /* Keep the session choice. */ }
  return theme;
}
