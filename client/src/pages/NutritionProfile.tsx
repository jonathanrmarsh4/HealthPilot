import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, UtensilsCrossed, Shield, AlertCircle } from "lucide-react";
import type { NutritionProfile } from "@shared/schema";
import { useEffect } from "react";

const nutritionProfileSchema = z.object({
  dietaryPreferences: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  intolerances: z.array(z.string()).optional(),
});

type NutritionProfileForm = z.infer<typeof nutritionProfileSchema>;

const DIETARY_PREFERENCES = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "pescatarian", label: "Pescatarian" },
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

const COMMON_INTOLERANCES = [
  { id: "lactose", label: "Lactose" },
  { id: "gluten", label: "Gluten" },
  { id: "fructose", label: "Fructose" },
  { id: "fodmap", label: "FODMAP" },
  { id: "histamine", label: "Histamine" },
];

export default function NutritionProfile() {
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<NutritionProfile>({
    queryKey: ["/api/nutrition-profile"],
  });

  const form = useForm<NutritionProfileForm>({
    resolver: zodResolver(nutritionProfileSchema),
    defaultValues: {
      dietaryPreferences: [],
      allergies: [],
      intolerances: [],
    },
  });

  useEffect(() => {
    if (profile && !form.formState.isDirty) {
      form.reset({
        dietaryPreferences: profile.dietaryPreferences || [],
        allergies: profile.allergies || [],
        intolerances: profile.intolerances || [],
      });
    }
  }, [profile, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: NutritionProfileForm) => {
      const res = await apiRequest(
        profile ? "PATCH" : "POST",
        "/api/nutrition-profile",
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-profile"] });
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
          Set your dietary preferences and food restrictions for safe, personalized meal recommendations
        </p>
      </div>

      {!profile && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-primary">Complete Your Nutrition Profile</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your nutrition profile to unlock AI-powered meal plans that respect your dietary needs and restrictions.
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
          
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Food Allergies
              </CardTitle>
              <CardDescription>
                Select any foods you&apos;re allergic to. These will be completely excluded from meal recommendations.
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Food Intolerances
              </CardTitle>
              <CardDescription>
                Select any foods you have difficulty digesting or that cause discomfort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="intolerances"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {COMMON_INTOLERANCES.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="intolerances"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    data-testid={`checkbox-intolerance-${item.id}`}
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

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="button-save-profile"
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
