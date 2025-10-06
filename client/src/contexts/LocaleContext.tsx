import { createContext, useContext, useState, useEffect } from "react";

export type UnitSystem = "metric" | "imperial";

export type Locale = "en-US" | "en-GB" | "en-CA" | "en-AU" | "es-ES" | "fr-FR" | "de-DE" | "it-IT" | "ja-JP" | "zh-CN";

interface LocaleContextType {
  unitSystem: UnitSystem;
  locale: Locale;
  setUnitSystem: (system: UnitSystem) => void;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

function getDefaultUnitSystem(): UnitSystem {
  const locale = navigator.language || "en-US";
  
  if (locale.startsWith("en-US") || locale.startsWith("en-LR") || locale.startsWith("en-MM")) {
    return "imperial";
  }
  
  return "metric";
}

function getDefaultLocale(): Locale {
  const browserLocale = navigator.language;
  
  const supportedLocales: Locale[] = [
    "en-US", "en-GB", "en-CA", "en-AU",
    "es-ES", "fr-FR", "de-DE", "it-IT",
    "ja-JP", "zh-CN"
  ];
  
  const exactMatch = supportedLocales.find(l => l === browserLocale);
  if (exactMatch) return exactMatch;
  
  const langMatch = supportedLocales.find(l => l.startsWith(browserLocale.split("-")[0]));
  if (langMatch) return langMatch;
  
  return "en-US";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => {
    const stored = localStorage.getItem("unitSystem");
    return (stored as UnitSystem) || getDefaultUnitSystem();
  });

  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem("locale");
    return (stored as Locale) || getDefaultLocale();
  });

  useEffect(() => {
    localStorage.setItem("unitSystem", unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    localStorage.setItem("locale", locale);
  }, [locale]);

  const setUnitSystem = (system: UnitSystem) => {
    setUnitSystemState(system);
  };

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  return (
    <LocaleContext.Provider value={{ unitSystem, locale, setUnitSystem, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
