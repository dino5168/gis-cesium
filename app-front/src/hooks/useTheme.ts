import { useState, useLayoutEffect } from "react";

export type Theme = "system" | "light" | "dark" | "dark-blue";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) ?? "system",
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = (prefersDark: boolean) => {
      root.classList.remove("dark", "dark-blue");
      if (theme === "dark") root.classList.add("dark");
      else if (theme === "dark-blue") root.classList.add("dark-blue");
      else if (theme === "system" && prefersDark) root.classList.add("dark");
    };

    localStorage.setItem("theme", theme);
    apply(mq.matches);

    if (theme === "system") {
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  return { theme, setTheme };
}
