'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts 'light' on both server and first client render so hydration matches,
  // then syncs below. This is only the CONTEXT value — the actual class on
  // <html> is already correct before first paint, applied by the blocking
  // script in layout.tsx, so there is no visual flash while this catches up.
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // Read back what the pre-paint script resolved rather than resolving again,
    // so the context can never disagree with what is actually on screen.
    const applied: Theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setThemeState(applied);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem('theme', t); } catch { /* private mode */ }
    // Both hooks: globals.css targets `[data-theme="dark"], .dark`, and the
    // header toggle used to set the attribute while this set only the class.
    // Now that AppShell delegates here, this is the one place either is
    // written, so it has to write both or half the rules would miss.
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  // Always render the Provider. Previously this returned a bare fragment until
  // mounted, which changed the tree shape between the server render and the
  // client, and left every useTheme() consumer reading the default context
  // (always 'light') during that window.
  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
