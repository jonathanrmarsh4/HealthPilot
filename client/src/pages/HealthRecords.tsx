import { HealthRecordUpload } from "@/components/HealthRecordUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";

const mockRecords = [
  {
    id: 1,
    name: "Blood Work Panel - Complete",
    date: "2024-10-01",
    type: "Lab Results",
    status: "analyzed",
  },
  {
    id: 2,
    name: "Annual Physical Exam",
    date: "2024-09-15",
    type: "Medical Report",
    status: "analyzed",
  },
  {
    id: 3,
    name: "Lipid Panel Results",
    date: "2024-08-20",
    type: "Lab Results",
    status: "pending",
  },
];

export default function HealthRecords() {
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
            <div className="space-y-3">
              {mockRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-md bg-muted/50 p-4 hover-elevate"
                  data-testid={`record-${record.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{record.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{record.date}</p>
                        <Badge variant="outline" className="text-xs">
                          {record.type}
                        </Badge>
                        <Badge
                          className={
                            record.status === "analyzed"
                              ? "bg-chart-4 text-white text-xs"
                              : "bg-chart-5 text-white text-xs"
                          }
                        >
                          {record.status === "analyzed" ? "AI Analyzed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => console.log(`View record ${record.id}`)}
                      data-testid={`button-view-${record.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => console.log(`Download record ${record.id}`)}
                      data-testid={`button-download-${record.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
