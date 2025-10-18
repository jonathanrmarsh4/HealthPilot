import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

// Granular onboarding flags for contextual approach
interface OnboardingStatus {
  basicInfoComplete: boolean;
  trainingSetupComplete: boolean;
  mealsSetupComplete: boolean;
  supplementsSetupComplete: boolean;
  biomarkersSetupComplete: boolean;
  startedAt: Date | null;
}

interface OnboardingContextType {
  status: OnboardingStatus | null;
  isLoading: boolean;
  shouldShowOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { data: status, isLoading } = useQuery<OnboardingStatus>({
    queryKey: ['/api/onboarding/status'],
  });

  // User is in onboarding if they haven't completed basic info
  // TEMPORARILY DISABLED FOR DEVELOPMENT/TESTING
  const shouldShowOnboarding = false; // Set to: Boolean(status && !status.basicInfoComplete) for production

  return (
    <OnboardingContext.Provider
      value={{
        status: status ?? null,
        isLoading,
        shouldShowOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
