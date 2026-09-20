"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "mp-theme";

/** Light by default (readable outdoors); dark available and remembered per device. */
export function ThemeToggle({ labels }: { labels: { toLight: string; toDark: string } }) {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));

    setReady(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      // Private browsing: the choice simply does not persist.
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-pressed={ready ? dark : undefined}
      aria-label={dark ? labels.toLight : labels.toDark}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

/** Applies the stored theme before paint, so there is no flash. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches&&false)){document.documentElement.classList.add("dark")}}catch(e){}})();`;
