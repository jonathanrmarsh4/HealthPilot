import { useState, useEffect } from "react";
import { DataInputForm } from "@/components/DataInputForm";
import { BiomarkerChart } from "@/components/BiomarkerChart";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/LocaleContext";
import { unitConfigs, convertValue } from "@/lib/unitConversions";
import { Settings2, Eye, EyeOff, ChevronUp, ChevronDown, X, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { biomarkerDisplayConfig, type BiomarkerConfig } from "@/lib/biomarkerConfig";

interface ChartDataPoint {
  date: string;
  value: number;
  target?: number;
}

interface Biomarker {
  id: string;
  type: string;
  value: number;
  unit: string;
  recordedAt: string;
  source: string;
}

const STORAGE_KEY = "biomarker-preferences";

interface BiomarkerPreferences {
  visible: string[];
  order: string[];
}

export default function Biomarkers() {
  const { unitSystem } = useLocale();
  const { toast } = useToast();
  
  // Get all biomarkers to determine which types exist
  const { data: allBiomarkers, isLoading: biomarkersLoading } = useQuery<Biomarker[]>({
    queryKey: ["/api/biomarkers"],
  });

  // Get unique biomarker types that have data
  const availableTypes = Array.from(new Set(allBiomarkers?.map(b => b.type) || []));
  
  // Cleanup duplicates mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/biomarkers/cleanup-duplicates", {});
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Cleanup Complete",
        description: data.message || `Removed ${data.deletedCount} duplicate biomarkers`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/biomarkers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clean up duplicates",
        variant: "destructive",
      });
    },
  });

  // Load preferences from localStorage
  const [preferences, setPreferences] = useState<BiomarkerPreferences>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { visible: availableTypes, order: availableTypes };
      }
    }
    return { visible: availableTypes, order: availableTypes };
  });

  // Update preferences when available types change
  useEffect(() => {
    setPreferences(prev => {
      // Add new types to visible and order
      const newTypes = availableTypes.filter(t => !prev.order.includes(t));
      const updatedOrder = [...prev.order.filter(t => availableTypes.includes(t)), ...newTypes];
      const updatedVisible = [...prev.visible.filter(t => availableTypes.includes(t)), ...newTypes];
      
      return {
        visible: updatedVisible,
        order: updatedOrder
      };
    });
  }, [availableTypes.join(',')]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const toggleVisibility = (type: string) => {
    setPreferences(prev => ({
      ...prev,
      visible: prev.visible.includes(type)
        ? prev.visible.filter(t => t !== type)
        : [...prev.visible, type]
    }));
  };

  const moveUp = (type: string) => {
    setPreferences(prev => {
      const index = prev.order.indexOf(type);
      if (index <= 0) return prev;
      const newOrder = [...prev.order];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return { ...prev, order: newOrder };
    });
  };

  const moveDown = (type: string) => {
    setPreferences(prev => {
      const index = prev.order.indexOf(type);
      if (index === -1 || index >= prev.order.length - 1) return prev;
      const newOrder = [...prev.order];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return { ...prev, order: newOrder };
    });
  };

  const showAll = () => {
    setPreferences(prev => ({ ...prev, visible: availableTypes }));
  };

  const hideAll = () => {
    setPreferences(prev => ({ ...prev, visible: [] }));
  };

  const visibleTypes = preferences.order.filter(t => preferences.visible.includes(t) && availableTypes.includes(t));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Biomarkers</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your key health biomarkers over time
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="default" 
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
            data-testid="button-cleanup-duplicates"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {cleanupMutation.isPending ? "Cleaning..." : "Clean Duplicates"}
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="default" data-testid="button-manage-biomarkers">
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Charts
              </Button>
            </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Manage Biomarker Charts</SheetTitle>
              <SheetDescription>
                Show, hide, and reorder your biomarker charts
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={showAll}
                  data-testid="button-show-all"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Show All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={hideAll}
                  data-testid="button-hide-all"
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide All
                </Button>
              </div>

              <div className="space-y-2">
                {preferences.order.filter(t => availableTypes.includes(t)).map((type, index) => {
                  const config = biomarkerDisplayConfig[type] || {
                    title: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                  };
                  const isVisible = preferences.visible.includes(type);
                  
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-2 p-3 rounded-md border"
                      data-testid={`biomarker-item-${type}`}
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2">
                          {isVisible ? (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{config.title}</span>
                        </div>
                        <Badge variant="secondary" className="w-fit text-xs">
                          {type}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveUp(type)}
                          disabled={index === 0}
                          data-testid={`button-move-up-${type}`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveDown(type)}
                          disabled={index === preferences.order.filter(t => availableTypes.includes(t)).length - 1}
                          data-testid={`button-move-down-${type}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(type)}
                          data-testid={`button-toggle-${type}`}
                        >
                          {isVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataInputForm />
        
        {biomarkersLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : visibleTypes.length > 0 ? (
          <BiomarkerTypeChart type={visibleTypes[0]} />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {availableTypes.length === 0 ? (
                <>No biomarker data available. Upload health records or manually enter data to get started.</>
              ) : (
                <>All biomarker charts are hidden. Click "Manage Charts" to show some charts.</>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {!biomarkersLoading && visibleTypes.length > 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {visibleTypes.slice(1).map(type => (
            <BiomarkerTypeChart key={type} type={type} />
          ))}
        </div>
      )}
    </div>
  );
}

function BiomarkerTypeChart({ type }: { type: string }) {
  const { unitSystem } = useLocale();
  const config = biomarkerDisplayConfig[type] || {
    title: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: "Recent trend",
    days: 30,
    color: "hsl(var(--chart-2))"
  };

  const { data: chartData, isLoading } = useQuery<ChartDataPoint[]>({
    queryKey: [`/api/biomarkers/chart/${type}?days=${config.days}`],
  });

  // Convert data if needed for this biomarker type
  const convertedData = chartData?.map(point => {
    const biomarkerConfig = unitConfigs[type];
    if (biomarkerConfig && biomarkerConfig.imperial && biomarkerConfig.metric) {
      // Find the original unit from the config
      const originalUnit = biomarkerConfig.imperial.unit;
      const targetUnit = biomarkerConfig[unitSystem].unit;
      
      return {
        ...point,
        value: convertValue(point.value, type, originalUnit, targetUnit),
      };
    }
    return point;
  });

  const displayUnit = unitConfigs[type]?.[unitSystem]?.unit || chartData?.[0]?.value !== undefined ? 
    (type === "steps" ? "steps" : 
     type === "heart-rate" ? "bpm" : 
     type === "blood-pressure" ? "mmHg" :
     type === "bmi" ? "BMI" : 
     type.includes("cholesterol") || type.includes("glucose") ? "mg/dL" :
     type === "alt" || type === "ast" || type === "alp" ? "U/L" :
     type === "creatinine" ? "mg/dL" :
     type === "hba1c" ? "%" :
     "units") : "units";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!convertedData || convertedData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No {config.title.toLowerCase()} data available
        </CardContent>
      </Card>
    );
  }

  return (
    <BiomarkerChart
      title={config.title}
      description={config.description}
      data={convertedData}
      unit={displayUnit}
      color={config.color}
    />
  );
}
