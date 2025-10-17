import { DataInputForm } from "@/components/DataInputForm";
import { TrendLineWidget } from "@/components/TrendLineWidget";
import { HealthKitSync } from "@/components/HealthKitSync";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { subsections } from "@/lib/biomarkerConfig";
import { TileManager, TileConfig } from "@/components/TileManager";

interface Biomarker {
  id: string;
  type: string;
  value: number;
  unit: string;
  recordedAt: string;
  source: string;
}

export default function Biomarkers() {
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

  // Define tiles for the Biomarkers page
  const tiles: TileConfig[] = [
    {
      id: "data-input",
      title: "Data Input",
      description: "Manually enter biomarker values",
      renderTile: () => <DataInputForm />,
      alwaysVisible: true // Important for data entry
    },
    {
      id: "healthkit-sync",
      title: "HealthKit Sync",
      description: "Sync biomarkers from Apple Health",
      renderTile: () => <HealthKitSync />
    },
    {
      id: "biomarker-trends",
      title: "Biomarker Trends",
      description: "View your biomarker data over time",
      renderTile: () => {
        if (biomarkersLoading) {
          return (
            <div className="grid gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        }

        if (availableTypes.length === 0) {
          return (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No biomarker data available. Upload health records or manually enter data to get started.
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-8">
            {Object.entries(subsections).map(([key, subsection]) => {
              // Filter biomarkers that exist in this subsection
              const subsectionBiomarkers = subsection.biomarkers.filter(type => 
                availableTypes.includes(type)
              );

              // Skip if no biomarkers in this subsection
              if (subsectionBiomarkers.length === 0) {
                return null;
              }

              return (
                <div key={key} className="space-y-4" data-testid={`subsection-${key}`}>
                  <div className="border-b pb-2">
                    <h2 className="text-2xl font-semibold">{subsection.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {subsectionBiomarkers.length} biomarker{subsectionBiomarkers.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {subsectionBiomarkers.map(type => (
                      <TrendLineWidget key={type} type={type} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
      alwaysVisible: true // Core functionality
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Biomarkers</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your key health biomarkers over time
          </p>
        </div>
        
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
      </div>

      <TileManager
        page="biomarkers"
        tiles={tiles}
        defaultVisible={["data-input", "healthkit-sync", "biomarker-trends"]}
      />
    </div>
  );
}
