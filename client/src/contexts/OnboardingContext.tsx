import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

type OnboardingStep = 'welcome' | 'apple_health' | 'health_records' | 'training_plan' | 'meal_plan';

interface OnboardingStatus {
  completed: boolean;
  step: OnboardingStep | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface OnboardingContextType {
  status: OnboardingStatus | null;
  isLoading: boolean;
  updateStep: (step: OnboardingStep) => Promise<void>;
  skipStep: (currentStep: OnboardingStep, nextStep: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  shouldShowOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { data: status, isLoading } = useQuery<OnboardingStatus>({
    queryKey: ['/api/onboarding/status'],
  });

  const updateStepMutation = useMutation({
    mutationFn: async (step: OnboardingStep) => {
      return apiRequest('PATCH', '/api/onboarding/step', { step });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
    },
  });

  const skipStepMutation = useMutation({
    mutationFn: async ({ currentStep, nextStep }: { currentStep: OnboardingStep; nextStep: OnboardingStep }) => {
      return apiRequest('POST', '/api/onboarding/skip', { currentStep, nextStep });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/onboarding/complete', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
    },
  });

  const shouldShowOnboarding = Boolean(status && !status.completed);

  const updateStep = async (step: OnboardingStep) => {
    await updateStepMutation.mutateAsync(step);
  };

  const skipStep = async (currentStep: OnboardingStep, nextStep: OnboardingStep) => {
    await skipStepMutation.mutateAsync({ currentStep, nextStep });
  };

  const completeOnboarding = async () => {
    await completeOnboardingMutation.mutateAsync();
  };

  return (
    <OnboardingContext.Provider
      value={{
        status: status ?? null,
        isLoading,
        updateStep,
        skipStep,
        completeOnboarding,
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
