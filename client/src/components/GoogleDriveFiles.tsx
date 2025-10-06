import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime: string;
}

export function GoogleDriveFiles() {
  const { toast } = useToast();
  
  const { data: files, isLoading } = useQuery<GoogleDriveFile[]>({
    queryKey: ["/api/google-drive/files"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return await apiRequest(`/api/health-records/analyze/${fileId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/biomarkers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Google Drive file analyzed successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to analyze file",
        variant: "destructive",
      });
    },
  });

  const handleViewFile = (file: GoogleDriveFile) => {
    if (file.webViewLink) {
      window.open(file.webViewLink, "_blank");
    }
  };

  const handleAnalyze = (fileId: string) => {
    analyzeMutation.mutate(fileId);
  };

  return (
    <Card data-testid="card-google-drive">
      <CardHeader>
        <CardTitle>Google Drive Files</CardTitle>
        <CardDescription>
          Your health documents from Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
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
                  <Button
                    size="sm"
                    onClick={() => handleAnalyze(file.id)}
                    disabled={analyzeMutation.isPending}
                    data-testid={`button-analyze-${file.id}`}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze
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
