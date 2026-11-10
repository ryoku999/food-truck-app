import { Palette } from "lucide-react";
import { useState } from "react";

const themes = document.documentElement.dataset.appThemes?.split(" ").filter(Boolean) ?? ["sunset"];
const labels: Record<string, string> = { light: "Claro", dark: "Oscuro" };

function initialTheme() {
  const current = document.documentElement.dataset.theme;
  return current && themes.includes(current) ? current : "sunset";
}

export default function ThemeSelector() {
  const [theme, setTheme] = useState(initialTheme);

  function changeTheme(value: string) {
    if (!themes.includes(value)) return;
    document.documentElement.dataset.theme = value;
    setTheme(value);
    try {
      localStorage.setItem("app-theme", value);
    } catch {
      // The selection still applies for this page.
    }
  }

  return (
    <label className="flex items-center gap-2">
      <Palette className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Tema de la aplicación</span>
      <select className="select select-sm w-36 min-h-11" value={theme} onChange={event => changeTheme(event.target.value)}>
        {themes.map(value => (
          <option key={value} value={value}>{labels[value] ?? value.charAt(0).toUpperCase() + value.slice(1)}</option>
        ))}
      </select>
    </label>
  );
}
