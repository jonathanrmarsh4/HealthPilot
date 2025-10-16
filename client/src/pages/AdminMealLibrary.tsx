import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChefHat, Upload, Settings, Trash2, TrendingDown, Shield, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MealLibrary, MealLibrarySettings } from "@shared/schema";

const cuisineOptions = [
  "Italian", "Mexican", "Chinese", "Japanese", "Thai", "Indian", 
  "Mediterranean", "American", "French", "Korean", "Greek", "Spanish"
];

const dietOptions = [
  "Vegetarian", "Vegan", "Gluten Free", "Ketogenic", "Paleo", 
  "Pescetarian", "Whole 30", "Low FODMAP"
];

const mealTypeOptions = ["Breakfast", "Lunch", "Dinner", "Snack"];

interface MealWithProtection extends MealLibrary {
  hasPremiumUserProtection?: boolean;
  premiumUsersCount?: number;
}

export default function AdminMealLibrary() {
  const { toast } = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<MealLibrary | null>(null);
  
  const [importCount, setImportCount] = useState(100);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>([]);
  const [maxReadyTime, setMaxReadyTime] = useState(60);

  const [librarySize, setLibrarySize] = useState(100);
  const [deletionThreshold, setDeletionThreshold] = useState(0.4);
  const [autoReplacementEnabled, setAutoReplacementEnabled] = useState(true);

  const { data: meals, isLoading: mealsLoading } = useQuery<MealLibrary[]>({
    queryKey: ["/api/admin/meal-library"],
  });

  const { data: lowPerformingMeals, isLoading: lowPerformingLoading } = useQuery<MealWithProtection[]>({
    queryKey: ["/api/admin/meal-library/low-performing"],
  });

  const { data: settings } = useQuery<MealLibrarySettings | null>({
    queryKey: ["/api/admin/meal-library/settings"],
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/meal-library/import", {
        count: importCount,
        cuisines: selectedCuisines.length > 0 ? selectedCuisines : undefined,
        diets: selectedDiets.length > 0 ? selectedDiets : undefined,
        mealTypes: selectedMealTypes.length > 0 ? selectedMealTypes : undefined,
        maxReadyTime,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meal-library"] });
      setImportDialogOpen(false);
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.imported} of ${data.requested} meals`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/meal-library/${mealId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meal-library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meal-library/low-performing"] });
      setDeleteDialogOpen(false);
      setMealToDelete(null);
      toast({
        title: "Meal Deleted",
        description: "Meal has been removed from the library",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/meal-library/settings", {
        librarySizeTarget: librarySize,
        deletionThreshold,
        autoReplaceEnabled: autoReplacementEnabled ? 1 : 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meal-library/settings"] });
      setSettingsDialogOpen(false);
      toast({
        title: "Settings Updated",
        description: "Meal library settings have been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    importMutation.mutate();
  };

  const handleDelete = (meal: MealLibrary) => {
    setMealToDelete(meal);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (mealToDelete) {
      deleteMutation.mutate(mealToDelete.id);
    }
  };

  const handleSettingsSave = () => {
    settingsMutation.mutate();
  };

  const openSettingsDialog = () => {
    if (settings) {
      setLibrarySize(settings.librarySizeTarget);
      setDeletionThreshold(settings.deletionThreshold);
      setAutoReplacementEnabled(settings.autoReplaceEnabled === 1);
    }
    setSettingsDialogOpen(true);
  };

  const activeMeals = meals?.filter(m => m.status === 'active') || [];
  const totalServed = activeMeals.reduce((sum, m) => sum + (m.totalServed || 0), 0);
  const averageConversion = activeMeals.length > 0 
    ? activeMeals.reduce((sum, m) => sum + (m.conversionRate || 0), 0) / activeMeals.length 
    : 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-primary" data-testid="icon-meal-library" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-meal-library-title">Meal Library Management</h1>
            <p className="text-muted-foreground" data-testid="text-meal-library-description">
              Manage meal inventory, performance metrics, and cost optimization
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={openSettingsDialog}
            data-testid="button-library-settings"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button 
            onClick={() => setImportDialogOpen(true)}
            data-testid="button-import-meals"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Meals
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-total-meals">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
            <ChefHat className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-meals">
              {meals?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">{activeMeals.length} active</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-total-served">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Served</CardTitle>
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-served">
              {totalServed}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-avg-conversion">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-conversion">
              {(averageConversion * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Thumbs up rate</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-low-performing">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Performing</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-low-performing-count">
              {lowPerformingMeals?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Below threshold</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="library" className="space-y-4">
        <TabsList data-testid="tabs-meal-library">
          <TabsTrigger value="library" data-testid="tab-library">Library</TabsTrigger>
          <TabsTrigger value="deletion-queue" data-testid="tab-deletion-queue">
            Deletion Queue
            {lowPerformingMeals && lowPerformingMeals.length > 0 && (
              <Badge variant="destructive" className="ml-2" data-testid="badge-deletion-count">
                {lowPerformingMeals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <Card data-testid="card-meal-library">
            <CardHeader>
              <CardTitle data-testid="text-library-title">Meal Library</CardTitle>
              <CardDescription data-testid="text-library-description">
                All meals in the library with performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mealsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="table-head-meal">Meal</TableHead>
                        <TableHead data-testid="table-head-cuisines">Cuisines</TableHead>
                        <TableHead data-testid="table-head-served">Served</TableHead>
                        <TableHead data-testid="table-head-conversion">Conversion</TableHead>
                        <TableHead data-testid="table-head-status">Status</TableHead>
                        <TableHead data-testid="table-head-actions">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meals?.map((meal) => (
                        <TableRow key={meal.id} data-testid={`row-meal-${meal.id}`}>
                          <TableCell data-testid={`cell-meal-info-${meal.id}`}>
                            <div>
                              <div className="font-medium" data-testid={`text-meal-title-${meal.id}`}>
                                {meal.title}
                              </div>
                              <div className="text-sm text-muted-foreground" data-testid={`text-meal-time-${meal.id}`}>
                                {meal.readyInMinutes} min
                              </div>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`cell-meal-cuisines-${meal.id}`}>
                            <div className="flex gap-1 flex-wrap">
                              {meal.cuisines?.slice(0, 2).map((cuisine, idx) => (
                                <Badge key={idx} variant="secondary" data-testid={`badge-cuisine-${idx}-${meal.id}`}>
                                  {cuisine}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell data-testid={`cell-meal-served-${meal.id}`}>
                            {meal.totalServed || 0}
                          </TableCell>
                          <TableCell data-testid={`cell-meal-conversion-${meal.id}`}>
                            <div className="flex items-center gap-2">
                              <span>{((meal.conversionRate || 0) * 100).toFixed(0)}%</span>
                              <div className="flex gap-1 text-xs">
                                <span className="text-green-600">↑{meal.thumbsUpCount || 0}</span>
                                <span className="text-red-600">↓{meal.thumbsDownCount || 0}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`cell-meal-status-${meal.id}`}>
                            <Badge
                              variant={meal.status === "active" ? "default" : "secondary"}
                              data-testid={`badge-status-${meal.id}`}
                            >
                              {meal.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`cell-meal-actions-${meal.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(meal)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-meal-${meal.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deletion-queue" className="space-y-4">
          <Card data-testid="card-deletion-queue">
            <CardHeader>
              <CardTitle data-testid="text-deletion-queue-title">Deletion Queue</CardTitle>
              <CardDescription data-testid="text-deletion-queue-description">
                Meals flagged for deletion based on performance threshold ({(deletionThreshold * 100).toFixed(0)}% thumbs down)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowPerformingLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : lowPerformingMeals && lowPerformingMeals.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="table-head-meal-del">Meal</TableHead>
                        <TableHead data-testid="table-head-performance">Performance</TableHead>
                        <TableHead data-testid="table-head-protection">Protection</TableHead>
                        <TableHead data-testid="table-head-actions-del">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowPerformingMeals.map((meal) => {
                        const thumbsDownRate = meal.totalServed 
                          ? ((meal.thumbsDownCount || 0) / meal.totalServed) * 100 
                          : 0;
                        
                        return (
                          <TableRow key={meal.id} data-testid={`row-deletion-meal-${meal.id}`}>
                            <TableCell data-testid={`cell-deletion-meal-info-${meal.id}`}>
                              <div>
                                <div className="font-medium" data-testid={`text-deletion-meal-title-${meal.id}`}>
                                  {meal.title}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Served {meal.totalServed} times
                                </div>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`cell-deletion-performance-${meal.id}`}>
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive" data-testid={`badge-thumbs-down-rate-${meal.id}`}>
                                  {thumbsDownRate.toFixed(0)}% thumbs down
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  ↑{meal.thumbsUpCount || 0} ↓{meal.thumbsDownCount || 0}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`cell-deletion-protection-${meal.id}`}>
                              {meal.hasPremiumUserProtection ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Shield className="w-4 h-4 text-primary" />
                                  <span className="text-primary" data-testid={`text-premium-protection-${meal.id}`}>
                                    {meal.premiumUsersCount} premium {meal.premiumUsersCount === 1 ? 'user' : 'users'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground" data-testid={`text-no-protection-${meal.id}`}>
                                  None
                                </span>
                              )}
                            </TableCell>
                            <TableCell data-testid={`cell-deletion-actions-${meal.id}`}>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(meal)}
                                disabled={meal.hasPremiumUserProtection}
                                data-testid={`button-force-delete-${meal.id}`}
                              >
                                {meal.hasPremiumUserProtection ? "Protected" : "Force Delete"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-deletions">
                  No meals flagged for deletion
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-import-meals">
          <DialogHeader>
            <DialogTitle data-testid="text-import-dialog-title">Import Meals from Spoonacular</DialogTitle>
            <DialogDescription data-testid="text-import-dialog-description">
              Configure diversity filters and import count for bulk meal import
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-count" data-testid="label-import-count">Number of Meals</Label>
              <Input
                id="import-count"
                type="number"
                value={importCount}
                onChange={(e) => setImportCount(parseInt(e.target.value) || 100)}
                min={1}
                max={500}
                data-testid="input-import-count"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-ready-time" data-testid="label-max-ready-time">Max Ready Time (minutes)</Label>
              <Input
                id="max-ready-time"
                type="number"
                value={maxReadyTime}
                onChange={(e) => setMaxReadyTime(parseInt(e.target.value) || 60)}
                min={10}
                max={180}
                data-testid="input-max-ready-time"
              />
            </div>

            <div className="space-y-2">
              <Label data-testid="label-cuisines">Cuisines (optional)</Label>
              <div className="grid grid-cols-3 gap-2">
                {cuisineOptions.map((cuisine) => (
                  <div key={cuisine} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cuisine-${cuisine}`}
                      checked={selectedCuisines.includes(cuisine)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCuisines([...selectedCuisines, cuisine]);
                        } else {
                          setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
                        }
                      }}
                      data-testid={`checkbox-cuisine-${cuisine}`}
                    />
                    <Label htmlFor={`cuisine-${cuisine}`} className="text-sm font-normal">
                      {cuisine}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label data-testid="label-diets">Dietary Restrictions (optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {dietOptions.map((diet) => (
                  <div key={diet} className="flex items-center space-x-2">
                    <Checkbox
                      id={`diet-${diet}`}
                      checked={selectedDiets.includes(diet)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDiets([...selectedDiets, diet]);
                        } else {
                          setSelectedDiets(selectedDiets.filter(d => d !== diet));
                        }
                      }}
                      data-testid={`checkbox-diet-${diet}`}
                    />
                    <Label htmlFor={`diet-${diet}`} className="text-sm font-normal">
                      {diet}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label data-testid="label-meal-types">Meal Types (optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {mealTypeOptions.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`meal-type-${type}`}
                      checked={selectedMealTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMealTypes([...selectedMealTypes, type]);
                        } else {
                          setSelectedMealTypes(selectedMealTypes.filter(t => t !== type));
                        }
                      }}
                      data-testid={`checkbox-meal-type-${type}`}
                    />
                    <Label htmlFor={`meal-type-${type}`} className="text-sm font-normal">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setImportDialogOpen(false)}
                data-testid="button-cancel-import"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={importMutation.isPending}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? "Importing..." : `Import ${importCount} Meals`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent data-testid="dialog-library-settings">
          <DialogHeader>
            <DialogTitle data-testid="text-settings-dialog-title">Library Settings</DialogTitle>
            <DialogDescription data-testid="text-settings-dialog-description">
              Configure meal library size, deletion rules, and replacement schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="library-size" data-testid="label-library-size">Target Library Size</Label>
              <Input
                id="library-size"
                type="number"
                value={librarySize}
                onChange={(e) => setLibrarySize(parseInt(e.target.value) || 100)}
                min={50}
                max={1000}
                data-testid="input-library-size"
              />
              <p className="text-sm text-muted-foreground">
                Recommended size for optimal variety and performance tracking
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deletion-threshold" data-testid="label-deletion-threshold">
                Deletion Threshold (thumbs down %)
              </Label>
              <Input
                id="deletion-threshold"
                type="number"
                value={deletionThreshold * 100}
                onChange={(e) => setDeletionThreshold((parseInt(e.target.value) || 40) / 100)}
                min={10}
                max={90}
                data-testid="input-deletion-threshold"
              />
              <p className="text-sm text-muted-foreground">
                Meals with this percentage or higher thumbs down will be flagged for deletion
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-replacement"
                checked={autoReplacementEnabled}
                onCheckedChange={(checked) => setAutoReplacementEnabled(checked as boolean)}
                data-testid="checkbox-auto-replacement"
              />
              <Label htmlFor="auto-replacement" className="text-sm font-normal">
                Enable automatic monthly replacement
              </Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSettingsDialogOpen(false)}
                data-testid="button-cancel-settings"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSettingsSave}
                disabled={settingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {settingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-meal">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-dialog-title">
              Delete Meal from Library
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-dialog-description">
              This will permanently remove "{mealToDelete?.title}" from the meal library. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-meal"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Meal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
