import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplementSchema, type Supplement, type SupplementRecommendation } from "@shared/schema";
import { z } from "zod";
import { Plus, Trash2, Check, X, Pill, Clock, Target } from "lucide-react";
import { useState } from "react";
import { TileManager, TileConfig } from "@/components/TileManager";

const supplementFormSchema = insertSupplementSchema.omit({ userId: true, active: true });

export default function Supplements() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: supplements = [], isLoading: supplementsLoading } = useQuery<Supplement[]>({
    queryKey: ["/api/supplements"],
  });

  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery<SupplementRecommendation[]>({
    queryKey: ["/api/supplement-recommendations?status=pending"]
  });

  const form = useForm<z.infer<typeof supplementFormSchema>>({
    resolver: zodResolver(supplementFormSchema),
    defaultValues: {
      name: "",
      dosage: "",
      timing: "morning",
      purpose: "",
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: z.infer<typeof supplementFormSchema>) => {
      return await apiRequest("POST", "/api/supplements", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements"] });
      toast({ title: "Supplement added to your stack" });
      setAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add supplement", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/supplements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements"] });
      toast({ title: "Supplement removed from your stack" });
    },
  });

  const acceptRecommendationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/supplement-recommendations/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplement-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reminders/today"] });
      toast({ title: "Supplement added to your stack with daily reminder" });
    },
  });

  const declineRecommendationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/supplement-recommendations/${id}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplement-recommendations"] });
      toast({ title: "Recommendation declined" });
    },
  });

  const onSubmit = (data: z.infer<typeof supplementFormSchema>) => {
    addMutation.mutate(data);
  };

  const groupedSupplements = supplements.reduce((acc, supp) => {
    if (!acc[supp.timing]) acc[supp.timing] = [];
    acc[supp.timing].push(supp);
    return acc;
  }, {} as Record<string, Supplement[]>);

  const timingOrder = ['morning', 'pre_workout', 'post_workout', 'evening'];
  const timingLabels = {
    'morning': 'Morning',
    'pre_workout': 'Pre-Workout',
    'post_workout': 'Post-Workout',
    'evening': 'Evening'
  };

  // Define tiles for the Supplements page
  const tiles: TileConfig[] = [
    {
      id: "supplement-management",
      title: "Supplement Management",
      description: "Manage your supplement stack, view AI recommendations, and track daily schedule",
      renderTile: () => (
        <Tabs defaultValue="stack" className="space-y-6">
          <TabsList>
            <TabsTrigger value="stack" data-testid="tab-stack">Current Stack</TabsTrigger>
            <TabsTrigger value="recommendations" data-testid="tab-recommendations">
              AI Recommendations
              {recommendations.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">
                  {recommendations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Daily Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="stack" className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {supplements.length} supplement{supplements.length !== 1 ? 's' : ''} in your stack
              </p>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-supplement">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Supplement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Supplement</DialogTitle>
                    <DialogDescription>
                      Add a supplement to your daily stack
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplement Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. Vitamin D3" 
                                {...field} 
                                data-testid="input-supplement-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dosage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dosage</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 5000 IU" 
                                {...field} 
                                data-testid="input-supplement-dosage"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="timing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timing</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-supplement-timing">
                                  <SelectValue placeholder="Select timing" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="morning">Morning</SelectItem>
                                <SelectItem value="pre_workout">Pre-Workout</SelectItem>
                                <SelectItem value="post_workout">Post-Workout</SelectItem>
                                <SelectItem value="evening">Evening</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="purpose"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Purpose (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="e.g. Support immune system and bone health" 
                                {...field} 
                                value={field.value || ""}
                                data-testid="input-supplement-purpose"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={addMutation.isPending}
                          data-testid="button-submit-supplement"
                        >
                          {addMutation.isPending ? "Adding..." : "Add Supplement"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {supplementsLoading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : supplements.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Pill className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No supplements in your stack yet</p>
                  <p className="text-sm">Add supplements manually or accept AI recommendations</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {supplements.map((supplement) => (
                  <Card key={supplement.id} data-testid={`card-supplement-${supplement.id}`}>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{supplement.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {supplement.dosage}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {timingLabels[supplement.timing as keyof typeof timingLabels]}
                          </Badge>
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(supplement.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${supplement.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    {supplement.purpose && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {supplement.purpose}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {recommendationsLoading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : recommendations.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>No pending recommendations</p>
                  <p className="text-sm mt-2">
                    Chat with your AI coach to get personalized supplement recommendations
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {recommendations.map((rec) => (
                  <Card key={rec.id} data-testid={`card-recommendation-${rec.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{rec.supplementName}</CardTitle>
                          <CardDescription className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {rec.dosage}
                            </Badge>
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptRecommendationMutation.mutate(rec.id)}
                            disabled={acceptRecommendationMutation.isPending}
                            data-testid={`button-accept-${rec.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => declineRecommendationMutation.mutate(rec.id)}
                            disabled={declineRecommendationMutation.isPending}
                            data-testid={`button-decline-${rec.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{rec.reason}</p>
                      {rec.biomarkerLinked && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Based on: {rec.biomarkerLinked}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <p className="text-sm text-muted-foreground mb-4">
              Your daily supplement schedule organized by timing
            </p>
            {timingOrder.map((timing) => {
              const timingSupplements = groupedSupplements[timing] || [];
              if (timingSupplements.length === 0) return null;
              
              return (
                <Card key={timing}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      {timingLabels[timing as keyof typeof timingLabels]}
                    </CardTitle>
                    <CardDescription>
                      {timingSupplements.length} supplement{timingSupplements.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {timingSupplements.map((supplement) => (
                        <div 
                          key={supplement.id} 
                          className="flex items-center justify-between p-3 rounded-md border"
                          data-testid={`schedule-item-${supplement.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Pill className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{supplement.name}</p>
                              <p className="text-sm text-muted-foreground">{supplement.dosage}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {supplements.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No scheduled supplements</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ),
      alwaysVisible: true // Core functionality
    }
  ];

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Supplement Stack</h1>
          <p className="text-muted-foreground">
            Manage your daily supplements and track adherence
          </p>
        </div>

        <TileManager
          page="supplements"
          tiles={tiles}
          defaultVisible={["supplement-management"]}
        />
      </div>
    </div>
  );
}
