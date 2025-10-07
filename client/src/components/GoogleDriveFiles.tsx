import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Loader2, CheckCircle2, X, Trash2, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useState, useRef } from "react";
import type { HealthRecord } from "@shared/schema";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime: string;
}

export function GoogleDriveFiles() {
  const { toast } = useToast();
  const [analyzingFiles, setAnalyzingFiles] = useState<Set<string>>(new Set());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  
  const { data: files, isLoading: filesLoading } = useQuery<GoogleDriveFile[]>({
    queryKey: ["/api/google-drive/files"],
  });

  const { data: existingRecords } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const controller = new AbortController();
      abortControllers.current.set(fileId, controller);
      
      const res = await apiRequest("POST", `/api/health-records/analyze/${fileId}`, undefined, {
        signal: controller.signal,
      });
      return res.json();
    },
    onSuccess: (data, fileId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/biomarkers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setAnalyzingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      abortControllers.current.delete(fileId);
    },
    onError: (error: Error, fileId) => {
      console.error("Error analyzing file:", error);
      setAnalyzingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      abortControllers.current.delete(fileId);
    },
  });

  // Manual analyze function
  const handleAnalyze = (fileId: string) => {
    if (!analyzingFiles.has(fileId)) {
      setAnalyzingFiles(prev => new Set(prev).add(fileId));
      analyzeMutation.mutate(fileId);
    }
  };

  const handleViewFile = (file: GoogleDriveFile) => {
    if (file.webViewLink) {
      window.open(file.webViewLink, "_blank");
    }
  };

  const isFileAnalyzed = (fileId: string) => {
    return existingRecords?.some(r => r.fileId === fileId);
  };

  const isFileAnalyzing = (fileId: string) => {
    return analyzingFiles.has(fileId);
  };

  const handleCancelAnalysis = (fileId: string) => {
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
      setAnalyzingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      abortControllers.current.delete(fileId);
      toast({
        title: "Analysis Cancelled",
        description: "File analysis has been stopped",
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      // Find the record to get its fileId
      const record = existingRecords?.find(r => r.id === recordId);
      if (record?.fileId) {
        // Cancel ongoing analysis if any
        const controller = abortControllers.current.get(record.fileId);
        if (controller) {
          controller.abort();
          setAnalyzingFiles(prev => {
            const next = new Set(prev);
            next.delete(record.fileId!);
            return next;
          });
          abortControllers.current.delete(record.fileId);
        }
      }
      
      const res = await apiRequest("DELETE", `/api/health-records/${recordId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/biomarkers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Record Deleted",
        description: "Health record and analysis have been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRecordIdForFile = (fileId: string) => {
    return existingRecords?.find(r => r.fileId === fileId)?.id;
  };

  return (
    <Card data-testid="card-google-drive">
      <CardHeader>
        <CardTitle>Google Drive Files</CardTitle>
        <CardDescription>
          Your health documents from Google Drive - click the sparkle icon to analyze with AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : files && files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-md bg-muted/50 p-4 hover-elevate"
                data-testid={`google-file-${file.id}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.createdTime).toLocaleDateString()}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Google Drive
                      </Badge>
                      {isFileAnalyzing(file.id) && (
                        <Badge className="bg-primary/10 text-primary text-xs">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Analyzing...
                        </Badge>
                      )}
                      {isFileAnalyzed(file.id) && !isFileAnalyzing(file.id) && (
                        <Badge className="bg-chart-4 text-white text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          AI Analyzed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleViewFile(file)}
                    data-testid={`button-view-google-${file.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!isFileAnalyzed(file.id) && !isFileAnalyzing(file.id) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleAnalyze(file.id)}
                      data-testid={`button-analyze-${file.id}`}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  )}
                  {isFileAnalyzing(file.id) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCancelAnalysis(file.id)}
                      data-testid={`button-cancel-${file.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {getRecordIdForFile(file.id) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(getRecordIdForFile(file.id)!)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-google-${file.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No files found in Google Drive. Make sure your Google Drive is connected and contains health documents.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
