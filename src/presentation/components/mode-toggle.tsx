import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-context";
import { Switch } from "./ui/switch";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <Switch
      aria-label="Modo oscuro"
      title={dark ? "Cambiar a Claro" : "Cambiar a Oscuro"}
      checked={dark}
      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      className="clay-press cursor-pointer border-border text-foreground after:hidden data-[size=default]:h-11 data-[size=default]:w-16 data-checked:bg-clay-lilac data-unchecked:bg-clay-peach dark:data-unchecked:bg-clay-peach"
      thumbClassName="clay-panel ml-1 bg-card group-data-[size=default]/switch:size-7 group-data-[size=default]/switch:data-checked:translate-x-[26px] dark:data-checked:bg-card dark:data-unchecked:bg-card"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 inset-x-1 grid grid-cols-2 place-items-center">
        <Sun className={dark ? "size-4 opacity-65" : "size-4"} />
        <Moon className={dark ? "size-4" : "size-4 opacity-65"} />
      </span>
    </Switch>
  );
}
