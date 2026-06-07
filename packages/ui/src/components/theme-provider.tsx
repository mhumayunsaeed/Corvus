"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "corvus-theme";

interface ThemeContextValue {
  /** The user's stored preference (may be "system"). */
  theme: ThemePreference;
  /** The actually-applied theme after resolving "system". */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  /** Toggle between dark and light (resolving from the current applied theme). */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  // Keep the legacy `dark` class in sync for any remaining `dark:` utilities.
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Used until the stored preference is read on mount. */
  defaultTheme?: ThemePreference;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    defaultTheme === "system" ? "dark" : defaultTheme
  );

  // Read stored preference once on mount.
  useEffect(() => {
    const stored =
      (typeof localStorage !== "undefined"
        ? (localStorage.getItem(STORAGE_KEY) as ThemePreference | null)
        : null) ?? defaultTheme;
    setThemeState(stored);
  }, [defaultTheme]);

  // Apply + react to system changes.
  useEffect(() => {
    const resolve = () =>
      theme === "system" ? systemTheme() : (theme as ResolvedTheme);

    const next = resolve();
    setResolvedTheme(next);
    applyTheme(next);

    if (theme !== "system" || typeof window === "undefined") return;

    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const updated = systemTheme();
      setResolvedTheme(updated);
      applyTheme(updated);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const applied =
        current === "system" ? systemTheme() : (current as ResolvedTheme);
      const next: ThemePreference = applied === "dark" ? "light" : "dark";
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}

/**
 * Inline, render-blocking script that applies the stored theme before paint to
 * avoid a flash of the wrong theme. Drop into <head> (Next: in the root layout).
 */
export function ThemeScript({
  defaultTheme = "dark",
}: {
  defaultTheme?: ThemePreference;
}) {
  const code = `(function(){try{var k='${STORAGE_KEY}';var s=localStorage.getItem(k)||'${defaultTheme}';var r=s==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):s;var e=document.documentElement;e.setAttribute('data-theme',r);e.classList.toggle('dark',r==='dark');e.classList.toggle('light',r==='light');}catch(_){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
