import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HeartPulse, ArrowLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect, useRef } from "react";

const symptomSchema = z.object({
  symptom: z.string().min(1, "Symptom name is required"),
  severity: z.enum(["1", "2", "3", "4", "5"]),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type SymptomForm = z.infer<typeof symptomSchema>;

export default function NewSymptom() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const symptomInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SymptomForm>({
    resolver: zodResolver(symptomSchema),
    defaultValues: {
      symptom: "",
      severity: "3",
      description: "",
      tags: "",
    },
  });

  useEffect(() => {
    symptomInputRef.current?.focus();
  }, []);

  const addSymptomMutation = useMutation({
    mutationFn: async (data: SymptomForm) => {
      const payload = {
        symptom: data.symptom,
        severity: parseInt(data.severity),
        description: data.description || null,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        timestamp: new Date().toISOString(),
      };
      return apiRequest("POST", "/api/symptoms", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms"] });
      toast({
        title: "Symptom logged",
        description: "Your symptom has been recorded successfully.",
      });
      setLocation("/symptoms");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log symptom",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SymptomForm) => {
    addSymptomMutation.mutate(data);
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation("/symptoms")}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Symptoms
      </Button>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Log New Symptom</h1>
        <p className="text-muted-foreground">
          Track how you're feeling to identify patterns
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5" />
            Symptom Details
          </CardTitle>
          <CardDescription>
            Record your symptom and its severity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="symptom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symptom Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        ref={symptomInputRef}
                        placeholder="e.g., Headache, Fatigue, Nausea"
                        data-testid="input-symptom"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-severity">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 - Very Mild</SelectItem>
                        <SelectItem value="2">2 - Mild</SelectItem>
                        <SelectItem value="3">3 - Moderate</SelectItem>
                        <SelectItem value="4">4 - Severe</SelectItem>
                        <SelectItem value="5">5 - Very Severe</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional details about the symptom..."
                        rows={3}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., morning, after meal, stress"
                        data-testid="input-tags"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Separate multiple tags with commas
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation("/symptoms")}
                  disabled={addSymptomMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={addSymptomMutation.isPending}
                  data-testid="button-submit"
                >
                  {addSymptomMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <HeartPulse className="h-4 w-4 mr-2" />
                      Log Symptom
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
