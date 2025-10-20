import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MedicalReport } from "@shared/schema";

export function MedicalReportUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const { data: reports, isLoading: reportsLoading } = useQuery<MedicalReport[]>({
    queryKey: ["/api/medical-reports"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/medical-reports/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: async (report: MedicalReport) => {
      // Immediately invalidate queries so the pending record appears in the list
      queryClient.invalidateQueries({ queryKey: ["/api/medical-reports"] });
      
      toast({
        title: "Upload successful",
        description: `${report.fileName} uploaded successfully. Starting interpretation...`,
      });
      
      // Automatically start interpretation
      interpretMutation.mutate(report.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const interpretMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return await apiRequest("POST", `/api/medical-reports/${reportId}/interpret`);
    },
    onSuccess: (data: MedicalReport) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-reports"] });
      
      if (data.status === 'completed') {
        toast({
          title: "Interpretation complete",
          description: `Successfully interpreted ${data.reportType} report. ${data.extractedBiomarkersCount || 0} biomarkers extracted.`,
        });
      } else if (data.status === 'discarded') {
        toast({
          title: "Report discarded",
          description: data.userFeedback || "Unable to interpret this report. Please check the file quality.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Interpretation failed",
          description: "An error occurred during interpretation.",
          variant: "destructive",
        });
      }
      
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-reports"] });
      toast({
        title: "Interpretation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (PNG, JPG)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const getStatusBadge = (report: MedicalReport) => {
    switch (report.status) {
      case 'processing':
        return (
          <Badge className="bg-primary/10 text-primary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'discarded':
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-3 w-3 mr-1" />
              Discarded
            </Badge>
          </div>
        );
      default:
        return (
          <Badge variant="secondary">
            Pending
          </Badge>
        );
    }
  };

  const isUploading = uploadMutation.isPending || interpretMutation.isPending;

  return (
    <Card data-testid="card-medical-report-upload">
      <CardHeader>
        <CardTitle>Medical Report Interpreter</CardTitle>
        <CardDescription>
          Upload lab reports, imaging results, or other medical documents for AI-powered interpretation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          data-testid="dropzone-medical-report"
        >
          {isUploading ? (
            <div className="space-y-3">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {uploadMutation.isPending ? 'Uploading...' : 'Interpreting medical report...'}
              </p>
            </div>
          ) : selectedFile ? (
            <div className="space-y-3">
              <FileText className="h-12 w-12 mx-auto text-primary" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleUpload} data-testid="button-upload-report">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Interpret
                </Button>
                <Button variant="outline" onClick={() => setSelectedFile(null)} data-testid="button-cancel-upload">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Drop your medical report here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
                id="medical-report-file-input"
                data-testid="input-file-medical-report"
              />
              <label htmlFor="medical-report-file-input">
                <Button variant="outline" asChild data-testid="button-browse-files">
                  <span>Browse Files</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground">
                Supported: PDF, PNG, JPG (max 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Recent Reports */}
        {reports && reports.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Recent Reports</h3>
            <div className="space-y-2">
              {reports.slice(0, 5).map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`card-report-${report.id}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-filename-${report.id}`}>
                        {report.fileName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{report.reportType || 'Unknown Type'}</span>
                        {report.confidenceScores.overall && (
                          <span>• {(report.confidenceScores.overall * 100).toFixed(0)}% confidence</span>
                        )}
                        {report.extractedBiomarkersCount !== undefined && report.extractedBiomarkersCount > 0 && (
                          <span>• {report.extractedBiomarkersCount} biomarkers</span>
                        )}
                      </div>
                      {report.status === 'discarded' && report.userFeedback && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 line-clamp-2" title={report.userFeedback}>
                          {report.userFeedback}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(report)}
                </div>
              ))}
            </div>
          </div>
        )}

        {reportsLoading && (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
