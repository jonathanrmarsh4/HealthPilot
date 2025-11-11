import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect } from "react";

const fitnessProfileFormSchema = z.object({
  fitnessLevel: z.string().default("intermediate"),
  trainingExperience: z.coerce.number().nullable(),
  currentTrainingFrequency: z.coerce.number().min(0).max(7).nullable(),
  hasGymAccess: z.boolean().default(false),
  gymType: z.string().nullable(),
  homeEquipment: z.array(z.string()).default([]),
  specialFacilities: z.array(z.string()).default([]),
  recoveryEquipment: z.array(z.string()).default([]),
  primaryGoal: z.string().nullable(),
  secondaryGoals: z.array(z.string()).default([]),
  preferredWorkoutTypes: z.array(z.string()).default([]),
  preferredDuration: z.coerce.number().min(15).max(180).nullable(),
  preferredIntensity: z.string().nullable(),
  availableDays: z.array(z.string()).default([]),
  injuries: z.string().default(""),
  limitations: z.string().default(""),
  medicalConditions: z.string().default(""),
  notes: z.string().nullable(),
});

export type FitnessProfileFormValues = z.infer<typeof fitnessProfileFormSchema>;

interface FitnessProfileData {
  fitnessLevel: string;
  trainingExperience: number | null;
  currentTrainingFrequency: number | null;
  hasGymAccess: number;
  gymType: string | null;
  homeEquipment: string[];
  specialFacilities: string[];
  recoveryEquipment: string[];
  primaryGoal: string | null;
  secondaryGoals: string[];
  preferredWorkoutTypes: string[];
  preferredDuration: number | null;
  preferredIntensity: string | null;
  availableDays: string[];
  injuries: string[];
  limitations: string[];
  medicalConditions: string[];
  notes: string | null;
}

export function useFitnessProfileForm() {
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<FitnessProfileData>({
    queryKey: ["/api/fitness-profile"],
  });

  const form = useForm<FitnessProfileFormValues>({
    resolver: zodResolver(fitnessProfileFormSchema),
    defaultValues: {
      fitnessLevel: "intermediate",
      trainingExperience: null,
      currentTrainingFrequency: null,
      hasGymAccess: false,
      gymType: null,
      homeEquipment: [],
      specialFacilities: [],
      recoveryEquipment: [],
      primaryGoal: null,
      secondaryGoals: [],
      preferredWorkoutTypes: [],
      preferredDuration: null,
      preferredIntensity: null,
      availableDays: [],
      injuries: "",
      limitations: "",
      medicalConditions: "",
      notes: null,
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile && !form.formState.isDirty) {
      form.reset({
        fitnessLevel: profile.fitnessLevel || "intermediate",
        trainingExperience: profile.trainingExperience,
        currentTrainingFrequency: profile.currentTrainingFrequency,
        hasGymAccess: profile.hasGymAccess === 1,
        gymType: profile.gymType,
        homeEquipment: profile.homeEquipment || [],
        specialFacilities: profile.specialFacilities || [],
        recoveryEquipment: profile.recoveryEquipment || [],
        primaryGoal: profile.primaryGoal,
        secondaryGoals: profile.secondaryGoals || [],
        preferredWorkoutTypes: profile.preferredWorkoutTypes || [],
        preferredDuration: profile.preferredDuration,
        preferredIntensity: profile.preferredIntensity,
        availableDays: profile.availableDays || [],
        injuries: profile.injuries?.join(", ") || "",
        limitations: profile.limitations?.join(", ") || "",
        medicalConditions: profile.medicalConditions?.join(", ") || "",
        notes: profile.notes,
      });
    }
  }, [profile, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FitnessProfileFormValues) => {
      return await apiRequest("POST", "/api/fitness-profile", {
        fitnessLevel: data.fitnessLevel,
        trainingExperience: data.trainingExperience,
        currentTrainingFrequency: data.currentTrainingFrequency,
        hasGymAccess: data.hasGymAccess ? 1 : 0,
        gymType: data.gymType,
        homeEquipment: data.homeEquipment,
        specialFacilities: data.specialFacilities,
        recoveryEquipment: data.recoveryEquipment,
        primaryGoal: data.primaryGoal,
        secondaryGoals: data.secondaryGoals,
        preferredWorkoutTypes: data.preferredWorkoutTypes,
        preferredDuration: data.preferredDuration,
        preferredIntensity: data.preferredIntensity,
        availableDays: data.availableDays,
        injuries: data.injuries ? data.injuries.split(",").map(i => i.trim()).filter(Boolean) : [],
        limitations: data.limitations ? data.limitations.split(",").map(l => l.trim()).filter(Boolean) : [],
        medicalConditions: data.medicalConditions ? data.medicalConditions.split(",").map(m => m.trim()).filter(Boolean) : [],
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fitness-profile"] });
      toast({
        title: "Profile saved",
        description: "Your fitness profile has been updated. The AI will now generate personalized workouts based on your preferences.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleArrayItem = (field: "homeEquipment" | "specialFacilities" | "recoveryEquipment" | "secondaryGoals" | "preferredWorkoutTypes" | "availableDays", item: string) => {
    const currentValue = form.getValues(field);
    if (currentValue.includes(item)) {
      form.setValue(field, currentValue.filter((i: string) => i !== item), { shouldDirty: true });
    } else {
      form.setValue(field, [...currentValue, item], { shouldDirty: true });
    }
  };

  const onSubmit = (data: FitnessProfileFormValues) => {
    saveMutation.mutate(data);
  };

  return {
    form,
    isLoading,
    isPending: saveMutation.isPending,
    onSubmit,
    toggleArrayItem,
  };
}
