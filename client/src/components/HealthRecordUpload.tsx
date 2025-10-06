import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

export function HealthRecordUpload() {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      console.log("File selected:", e.target.files[0].name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    console.log("Uploading file:", selectedFile.name);
    
    setTimeout(() => {
      setUploading(false);
      setSelectedFile(null);
      console.log("Upload completed");
    }, 2000);
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
              disabled={uploading}
              size="sm"
              data-testid="button-upload"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => console.log("Connect Google Drive")}
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
