import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, UtensilsCrossed, AlertCircle, Sparkles, CheckCircle } from "lucide-react";
import type { NutritionProfile } from "@shared/schema";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper to convert empty string to undefined before number coercion
const optionalNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined) ? undefined : val,
  z.coerce.number().min(0).optional()
);

const nutritionProfileSchema = z.object({
  dietaryPreferences: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  cuisinePreferences: z.array(z.string()).optional(),
  calorieTarget: optionalNumber,
  proteinTarget: optionalNumber,
  carbsTarget: optionalNumber,
  fatTarget: optionalNumber,
});

type NutritionProfileForm = z.infer<typeof nutritionProfileSchema>;

interface AIRecommendations {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  explanation: string;
}

const DIETARY_PREFERENCES = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "ketogenic", label: "Ketogenic (Keto)" },
  { id: "paleo", label: "Paleo" },
  { id: "whole30", label: "Whole30" },
  { id: "low-carb", label: "Low Carb" },
  { id: "low-fat", label: "Low Fat" },
  { id: "gluten-free", label: "Gluten Free" },
  { id: "dairy-free", label: "Dairy Free" },
];

const COMMON_ALLERGIES = [
  { id: "gluten", label: "Gluten" },
  { id: "dairy", label: "Dairy" },
  { id: "eggs", label: "Eggs" },
  { id: "tree-nuts", label: "Tree Nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "soy", label: "Soy" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "wheat", label: "Wheat" },
  { id: "sesame", label: "Sesame" },
];

const CUISINE_OPTIONS = [
  { id: "italian", label: "Italian" },
  { id: "mexican", label: "Mexican" },
  { id: "chinese", label: "Chinese" },
  { id: "japanese", label: "Japanese" },
  { id: "thai", label: "Thai" },
  { id: "indian", label: "Indian" },
  { id: "mediterranean", label: "Mediterranean" },
  { id: "french", label: "French" },
  { id: "greek", label: "Greek" },
  { id: "american", label: "American" },
  { id: "korean", label: "Korean" },
  { id: "vietnamese", label: "Vietnamese" },
];

export default function NutritionProfile() {
  const { toast } = useToast();
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendations | null>(null);

  const { data: profile, isLoading } = useQuery<NutritionProfile>({
    queryKey: ["/api/nutrition-profile"],
  });

  const form = useForm<NutritionProfileForm>({
    resolver: zodResolver(nutritionProfileSchema),
    defaultValues: {
      dietaryPreferences: [],
      allergies: [],
      cuisinePreferences: [],
      calorieTarget: undefined,
      proteinTarget: undefined,
      carbsTarget: undefined,
      fatTarget: undefined,
    },
  });

  // Update form when profile loads - use useEffect to avoid infinite re-renders
  useEffect(() => {
    if (profile && !form.formState.isDirty) {
      form.reset({
        dietaryPreferences: profile.dietaryPreferences || [],
        allergies: profile.allergies || [],
        cuisinePreferences: profile.cuisinePreferences || [],
        calorieTarget: profile.calorieTarget ?? undefined,
        proteinTarget: profile.proteinTarget ?? undefined,
        carbsTarget: profile.carbsTarget ?? undefined,
        fatTarget: profile.fatTarget ?? undefined,
      });
    }
  }, [profile, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: NutritionProfileForm) => {
      const cleanData = {
        ...data,
        calorieTarget: data.calorieTarget ?? null,
        proteinTarget: data.proteinTarget ?? null,
        carbsTarget: data.carbsTarget ?? null,
        fatTarget: data.fatTarget ?? null,
      };

      const res = await apiRequest(
        profile ? "PATCH" : "POST",
        "/api/nutrition-profile",
        cleanData
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-profile"] });
      setAiRecommendations(null); // Clear recommendations after save
      toast({
        title: "Success",
        description: "Nutrition profile saved successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save nutrition profile",
        variant: "destructive",
      });
    },
  });

  const getAIRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/nutrition-profile/ai-recommendations", {});
      return res.json() as Promise<AIRecommendations>;
    },
    onSuccess: (data) => {
      setAiRecommendations(data);
      toast({
        title: "AI Recommendations Ready",
        description: "Review the personalized macro targets below",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate recommendations",
      });
    },
  });

  const applyAIRecommendations = () => {
    if (!aiRecommendations) return;
    
    form.setValue('calorieTarget', aiRecommendations.calorieTarget);
    form.setValue('proteinTarget', aiRecommendations.proteinTarget);
    form.setValue('carbsTarget', aiRecommendations.carbsTarget);
    form.setValue('fatTarget', aiRecommendations.fatTarget);
    
    toast({
      title: "Applied",
      description: "AI recommendations have been applied to your targets",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Nutrition Profile</h1>
        <p className="text-muted-foreground mt-2">
          Set your dietary preferences and nutrition goals for personalized meal recommendations
        </p>
      </div>

      {!profile && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-primary">Complete Your Nutrition Profile</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your nutrition profile to unlock AI-powered meal plans tailored to your dietary needs, health goals, and taste preferences.
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
          
          {/* Dietary Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Dietary Preferences
              </CardTitle>
              <CardDescription>
                Select any dietary patterns you follow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="dietaryPreferences"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {DIETARY_PREFERENCES.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="dietaryPreferences"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    data-testid={`checkbox-diet-${item.id}`}
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item.id])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== item.id)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Food Allergies */}
          <Card>
            <CardHeader>
              <CardTitle>Food Allergies & Intolerances</CardTitle>
              <CardDescription>
                Select any foods you're allergic to or need to avoid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="allergies"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {COMMON_ALLERGIES.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="allergies"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    data-testid={`checkbox-allergy-${item.id}`}
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item.id])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== item.id)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Cuisine Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Cuisine Preferences</CardTitle>
              <CardDescription>
                Select cuisines you enjoy for meal variety
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="cuisinePreferences"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {CUISINE_OPTIONS.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="cuisinePreferences"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    data-testid={`checkbox-cuisine-${item.id}`}
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item.id])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== item.id)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Macro Targets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Daily Nutrition Targets</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => getAIRecommendationsMutation.mutate()}
                  disabled={getAIRecommendationsMutation.isPending}
                  data-testid="button-ai-recommendations"
                  className="gap-2"
                >
                  {getAIRecommendationsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Get AI Recommendations
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                Let AI recommend optimal macros based on your goals and health data, or set your own targets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiRecommendations && (
                <Alert className="bg-primary/5 border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <AlertDescription className="space-y-3">
                    <div>
                      <p className="font-semibold text-primary mb-1">AI Recommendation</p>
                      <p className="text-sm text-muted-foreground">{aiRecommendations.explanation}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="gap-1">
                        <span className="font-semibold">{aiRecommendations.calorieTarget}</span> calories
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <span className="font-semibold">{aiRecommendations.proteinTarget}g</span> protein
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <span className="font-semibold">{aiRecommendations.carbsTarget}g</span> carbs
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <span className="font-semibold">{aiRecommendations.fatTarget}g</span> fat
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={applyAIRecommendations}
                      data-testid="button-apply-recommendations"
                      className="gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Apply These Targets
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="calorieTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Calories</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 2000"
                          data-testid="input-calories"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                        />
                      </FormControl>
                      <FormDescription>Daily calorie goal</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proteinTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Protein (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 150"
                          data-testid="input-protein"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                        />
                      </FormControl>
                      <FormDescription>Daily protein in grams</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carbsTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Carbs (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 200"
                          data-testid="input-carbs"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                        />
                      </FormControl>
                      <FormDescription>Daily carbs in grams</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fatTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Fat (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 70"
                          data-testid="input-fat"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                        />
                      </FormControl>
                      <FormDescription>Daily fat in grams</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Macro Summary */}
              {(form.watch('proteinTarget') || form.watch('carbsTarget') || form.watch('fatTarget')) && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Macro Breakdown:</p>
                  <div className="flex flex-wrap gap-2">
                    {form.watch('proteinTarget') && (
                      <Badge variant="outline" data-testid="badge-protein-summary">
                        Protein: {form.watch('proteinTarget')}g ({Math.round((form.watch('proteinTarget') as number || 0) * 4)} cal)
                      </Badge>
                    )}
                    {form.watch('carbsTarget') && (
                      <Badge variant="outline" data-testid="badge-carbs-summary">
                        Carbs: {form.watch('carbsTarget')}g ({Math.round((form.watch('carbsTarget') as number || 0) * 4)} cal)
                      </Badge>
                    )}
                    {form.watch('fatTarget') && (
                      <Badge variant="outline" data-testid="badge-fat-summary">
                        Fat: {form.watch('fatTarget')}g ({Math.round((form.watch('fatTarget') as number || 0) * 9)} cal)
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              data-testid="button-save-profile"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Nutrition Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
