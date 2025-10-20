import { MedicalReportUpload } from "@/components/MedicalReportUpload";
import { GoogleDriveFiles } from "@/components/GoogleDriveFiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, RefreshCw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MedicalReport } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HealthRecords() {
  const { toast } = useToast();
  
  const { data: reports, isLoading } = useQuery<MedicalReport[]>({
    queryKey: ["/api/medical-reports"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/medical-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/biomarkers"] });
      toast({
        title: "Success",
        description: "Medical report deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete medical report",
        variant: "destructive",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/medical-reports/${id}/interpret`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-reports"] });
      toast({
        title: "Success",
        description: "Interpretation restarted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to retry interpretation",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (report: MedicalReport) => {
    switch (report.status) {
      case 'processing':
        return (
          <Badge className="bg-primary/10 text-primary text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing...
          </Badge>
        );
      case 'interpreted':
      case 'completed':
        return (
          <Badge className="bg-chart-4 text-white text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Interpreted
          </Badge>
        );
      case 'discarded':
        return (
          <Badge variant="outline" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Discarded
          </Badge>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-destructive text-destructive-foreground text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Failed
            </Badge>
            {report.userFeedback && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={report.userFeedback}>
                {report.userFeedback}
              </span>
            )}
          </div>
        );
      default:
        return (
          <Badge className="bg-chart-5 text-white text-xs">
            Pending
          </Badge>
        );
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Health Records</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage your medical documents, lab results, and imaging reports
        </p>
      </div>

      <MedicalReportUpload />

      <Card>
        <CardHeader>
          <CardTitle>Your Medical Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-md bg-muted/50 p-4 hover-elevate"
                  data-testid={`report-${report.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{report.fileName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(report.createdAt), "MMM d, yyyy")}
                        </p>
                        {report.reportType && (
                          <Badge variant="outline" className="text-xs">
                            {report.reportType.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {report.sourceFormat && (
                          <Badge variant="outline" className="text-xs">
                            {report.sourceFormat}
                          </Badge>
                        )}
                        {getStatusBadge(report)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {(report.status === 'failed' || report.status === 'discarded') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => retryMutation.mutate(report.id)}
                            disabled={retryMutation.isPending}
                            data-testid={`button-retry-${report.id}`}
                          >
                            <RefreshCw className={`h-4 w-4 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Retry interpretation</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(report.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${report.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete report</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No medical reports uploaded yet. Upload your first report above.
            </div>
          )}
        </CardContent>
      </Card>

      <GoogleDriveFiles />
    </div>
  );
}
