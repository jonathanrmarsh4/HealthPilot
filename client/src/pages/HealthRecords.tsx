import { HealthRecordUpload } from "@/components/HealthRecordUpload";
import { GoogleDriveFiles } from "@/components/GoogleDriveFiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { HealthRecord } from "@shared/schema";
import { format } from "date-fns";

export default function HealthRecords() {
  const { data: records, isLoading } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records"],
  });

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
                          <Badge
                            className={
                              record.analyzedAt
                                ? "bg-chart-4 text-white text-xs"
                                : "bg-chart-5 text-white text-xs"
                            }
                          >
                            {record.analyzedAt ? "AI Analyzed" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
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

      <GoogleDriveFiles />
    </div>
  );
}
