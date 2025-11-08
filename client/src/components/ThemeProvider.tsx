import { createContext, useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

const THEME_VERSION = "v2-dark-default";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const currentVersion = localStorage.getItem("theme-version");
    
    if (currentVersion !== THEME_VERSION) {
      localStorage.removeItem("theme");
      localStorage.setItem("theme-version", THEME_VERSION);
      return defaultTheme;
    }
    
    return (localStorage.getItem("theme") as Theme) || defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);

    // Update native status bar styling based on theme
    if (Capacitor.isNativePlatform()) {
      const updateStatusBar = async () => {
        try {
          if (theme === "dark") {
            // Dark mode: Use Style.Light for LIGHT content (text/icons) on dark background
            await StatusBar.setStyle({ style: Style.Light });
            // Android only - set dark background color
            if (Capacitor.getPlatform() === "android") {
              await StatusBar.setBackgroundColor({ color: "#000000" });
            }
          } else {
            // Light mode: Use Style.Dark for DARK content (text/icons) on light background
            await StatusBar.setStyle({ style: Style.Dark });
            // Android only - set light background color
            if (Capacitor.getPlatform() === "android") {
              await StatusBar.setBackgroundColor({ color: "#ffffff" });
            }
          }
        } catch (error) {
          console.warn("[ThemeProvider] Failed to update status bar:", error);
        }
      };

      updateStatusBar();
    }
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
