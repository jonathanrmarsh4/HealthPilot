import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type PremiumThemeProviderProps = {
  children: React.ReactNode;
};

type PremiumThemeProviderState = {
  isPremiumTheme: boolean;
  isLoading: boolean;
};

const PremiumThemeProviderContext = createContext<PremiumThemeProviderState | undefined>(
  undefined
);

export function PremiumThemeProvider({ children }: PremiumThemeProviderProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/theme/premium-enabled"],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [isPremiumTheme, setIsPremiumTheme] = useState(false);

  useEffect(() => {
    if (data?.enabled !== undefined) {
      setIsPremiumTheme(data.enabled);
    }
  }, [data]);

  useEffect(() => {
    const root = document.documentElement;
    
    if (isPremiumTheme) {
      root.classList.add("premium-theme");
    } else {
      root.classList.remove("premium-theme");
    }
  }, [isPremiumTheme]);

  return (
    <PremiumThemeProviderContext.Provider value={{ isPremiumTheme, isLoading }}>
      {children}
    </PremiumThemeProviderContext.Provider>
  );
}

export function usePremiumTheme() {
  const context = useContext(PremiumThemeProviderContext);
  if (context === undefined) {
    throw new Error("usePremiumTheme must be used within a PremiumThemeProvider");
  }
  return context;
}
