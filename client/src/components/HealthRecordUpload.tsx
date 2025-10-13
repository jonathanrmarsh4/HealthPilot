import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function HealthRecordUpload() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // Create AbortController with 5-minute timeout for large files
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

      try {
        const res = await fetch("/api/health-records/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Upload failed");
        }

        return res.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error("Upload timed out. Large files may take several minutes to process. Please try a smaller file or wait and try again.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/biomarkers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSelectedFile(null);
      toast({
        title: "Success",
        description: "Health record uploaded and analyzed successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const handleGoogleDriveConnect = () => {
    toast({
      title: "Google Drive Integration",
      description: "Google Drive is already connected! You can view and analyze your files from the Health Records page.",
    });
  };

  return (
    <Card data-testid="card-upload">
      <CardHeader>
        <CardTitle>Upload Health Records</CardTitle>
        <CardDescription>
          Upload lab results, medical reports, or health documents from your Google Drive or local device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center hover-elevate">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOC, or image files up to 10MB
            </p>
          </div>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            data-testid="input-file"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" size="sm" asChild>
              <span>Select File</span>
            </Button>
          </label>
        </div>

        {selectedFile && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                size="sm"
                data-testid="button-upload"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            
            {uploadMutation.isPending && (
              <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="font-medium mb-1">Processing your health record...</p>
                <p>Large files may take 2-3 minutes to analyze. Please don't close this page.</p>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleGoogleDriveConnect}
            data-testid="button-connect-drive"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M7.71 3.5L1.15 15l3.42 6h6.84l.4-.67 1.42-2.33L8 7.83 7.71 3.5zm6.84 0L8 14.33l3.23 5.67h6.85l6.55-11.34-3.42-5.16h-6.66z"/>
            </svg>
            Connect Google Drive
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
