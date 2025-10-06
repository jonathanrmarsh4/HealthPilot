import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Loader2, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
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
  
  const { data: files, isLoading: filesLoading } = useQuery<GoogleDriveFile[]>({
    queryKey: ["/api/google-drive/files"],
  });

  const { data: existingRecords } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiRequest("POST", `/api/health-records/analyze/${fileId}`);
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
    },
    onError: (error: Error, fileId) => {
      console.error("Error analyzing file:", error);
      setAnalyzingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    },
  });

  // Auto-analyze new files
  useEffect(() => {
    if (!files || !existingRecords || filesLoading) return;

    const existingFileIds = new Set(
      existingRecords
        .filter(r => r.fileId)
        .map(r => r.fileId)
    );

    const newFiles = files.filter(file => !existingFileIds.has(file.id));

    // Analyze new files automatically
    newFiles.forEach(file => {
      if (!analyzingFiles.has(file.id)) {
        setAnalyzingFiles(prev => new Set(prev).add(file.id));
        analyzeMutation.mutate(file.id);
      }
    });
  }, [files, existingRecords, filesLoading]);

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

  return (
    <Card data-testid="card-google-drive">
      <CardHeader>
        <CardTitle>Google Drive Files</CardTitle>
        <CardDescription>
          Your health documents from Google Drive (automatically analyzed by AI)
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
