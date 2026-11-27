import { useState, type PropsWithChildren } from "react";
import { ThemeContext, type Theme } from "./theme-context";
import { applyTheme, saveTheme } from "./theme";

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  function selectTheme(next: Theme) {
    applyTheme(next);
    setTheme(next);
    saveTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: selectTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
