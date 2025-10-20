import { HealthRecordUpload } from "@/components/HealthRecordUpload";
import { MedicalReportUpload } from "@/components/MedicalReportUpload";
import { GoogleDriveFiles } from "@/components/GoogleDriveFiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Trash2, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HealthRecord } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HealthRecords() {
  const { toast } = useToast();
  
  const { data: records, isLoading } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/health-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      toast({
        title: "Success",
        description: "Health record deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete health record",
        variant: "destructive",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/health-records/${id}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      toast({
        title: "Success",
        description: "Analysis restarted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to retry analysis",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (record: HealthRecord) => {
    const status = record.status || (record.analyzedAt ? 'completed' : 'pending');
    
    switch (status) {
      case 'processing':
        return (
          <Badge className="bg-primary/10 text-primary text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing...
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-chart-4 text-white text-xs">
            AI Analyzed
          </Badge>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-destructive text-destructive-foreground text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Failed
            </Badge>
            {record.errorMessage && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={record.errorMessage}>
                {record.errorMessage}
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

  const handleViewRecord = (record: HealthRecord) => {
    if (record.fileUrl) {
      window.open(record.fileUrl, "_blank");
    }
  };

  const handleDownload = (record: HealthRecord) => {
    if (record.fileUrl) {
      window.open(record.fileUrl, "_blank");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Health Records</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage your medical documents and lab results
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <HealthRecordUpload />
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : records && records.length > 0 ? (
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 p-4 hover-elevate"
                    data-testid={`record-${record.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{record.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(record.uploadedAt), "MMM d, yyyy")}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {record.type}
                          </Badge>
                          {getStatusBadge(record)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {record.status === 'failed' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => retryMutation.mutate(record.id)}
                              disabled={retryMutation.isPending}
                              data-testid={`button-retry-${record.id}`}
                            >
                              <RefreshCw className={`h-4 w-4 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Retry analysis</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleViewRecord(record)}
                        data-testid={`button-view-${record.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownload(record)}
                        data-testid={`button-download-${record.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(record.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${record.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No health records uploaded yet. Upload your first record above.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MedicalReportUpload />

      <GoogleDriveFiles />
    </div>
  );
}
