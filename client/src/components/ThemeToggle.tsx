import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { themeManager, type Theme } from "../lib/theme";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(themeManager.get());
  }, []);

  const handleToggle = () => {
    const next = themeManager.toggle();
    setTheme(next);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleToggle} className="gap-2 text-xs">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {theme === "dark" ? "Light" : "Dark"}
    </Button>
  );
};
