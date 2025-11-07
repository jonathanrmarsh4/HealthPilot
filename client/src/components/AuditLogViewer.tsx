import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, MapPin, Monitor, Filter } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AuditLog {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  metadata: any;
}

export function AuditLogViewer({ open, onOpenChange }: AuditLogViewerProps) {
  const [filterAction, setFilterAction] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/privacy/audit-log"],
    enabled: open,
  });

  const logs: AuditLog[] = data?.logs || [];
  const compliance = data?.compliance;

  // Get unique action types for filter
  // const actionTypes = ["all", ...new Set(logs.map(log => log.action))];

  // Filter logs based on selected action
  const filteredLogs = filterAction === "all" 
    ? logs 
    : logs.filter(log => log.action === filterAction);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("DELETE") || action.includes("REVOKED")) return "destructive";
    if (action.includes("UPDATE") || action.includes("GRANTED")) return "default";
    if (action.includes("CREATE") || action.includes("EXPORT")) return "outline";
    return "secondary";
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Access Audit Log
          </DialogTitle>
          <DialogDescription>
            Complete history of data access and modifications (HIPAA Compliant)
          </DialogDescription>
        </DialogHeader>

        {/* Compliance Info */}
        {compliance && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-xs font-medium text-primary mb-1">
              {compliance.standard}
            </p>
            <p className="text-xs text-muted-foreground">
              {compliance.coverage}
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[200px]" data-testid="select-audit-filter">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              {actionTypes.map((action) => (
                <SelectItem key={action} value={action}>
                  {action === "all" ? "All Actions" : formatAction(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground ml-auto">
            Showing {filteredLogs.length} of {logs.length} events
          </p>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {filterAction === "all" 
                  ? "No audit events recorded yet"
                  : "No events found for this filter"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="p-4 hover-elevate"
                  data-testid={`audit-log-${log.id}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={getActionBadgeVariant(log.action)}
                          data-testid={`badge-action-${log.id}`}
                        >
                          {formatAction(log.action)}
                        </Badge>
                        {log.resourceType && (
                          <span className="text-xs text-muted-foreground">
                            on {log.resourceType}
                          </span>
                        )}
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <div key={key}>
                              <strong>{key}:</strong> {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span data-testid={`timestamp-${log.id}`}>
                        {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {log.ipAddress && (
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">IP:</span>
                        <span className="font-mono" data-testid={`ip-${log.id}`}>
                          {log.ipAddress}
                        </span>
                      </div>
                    )}
                    {log.userAgent && (
                      <div className="flex items-center gap-2 text-xs">
                        <Monitor className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Device:</span>
                        <span 
                          className="truncate max-w-[200px]" 
                          title={log.userAgent}
                          data-testid={`user-agent-${log.id}`}
                        >
                          {log.userAgent.split(' ')[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>
            Audit logs are retained for 6 years as required by HIPAA regulations. 
            All entries include timestamp, IP address, and device information for complete traceability.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
