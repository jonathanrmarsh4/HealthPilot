import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface TimezoneContextType {
  timezone: string;
  setTimezone: (tz: string) => void;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>("UTC");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.timezone) {
            setTimezoneState(data.timezone);
          }
        }
      } catch (error) {
        console.error("Failed to fetch timezone:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimezone();
  }, []);

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, isLoading }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error("useTimezone must be used within a TimezoneProvider");
  }
  return context;
}
