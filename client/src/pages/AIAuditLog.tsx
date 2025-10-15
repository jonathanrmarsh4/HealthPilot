import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, History, Database } from "lucide-react";

interface AIAction {
  id: string;
  userId: string;
  actionType: string;
  targetTable: string;
  targetId: string | null;
  changesBefore: any;
  changesAfter: any;
  reasoning: string;
  conversationContext: string | null;
  success: number;
  errorMessage: string | null;
  createdAt: string;
}

export default function AIAuditLog() {
  const [filterType, setFilterType] = useState<string>("all");

  const { data: allActions, isLoading } = useQuery<AIAction[]>({
    queryKey: ['/api/ai-actions', { limit: 100 }],
  });

  const filteredActions = filterType === "all" 
    ? allActions 
    : allActions?.filter(action => action.actionType === filterType);

  const actionTypes = allActions 
    ? Array.from(new Set(allActions.map(a => a.actionType)))
    : [];

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">AI Audit Log</h1>
        <p className="text-muted-foreground">
          Track all AI-initiated changes to your health data with full transparency and audit trail
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Filter Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-64" data-testid="select-filter-type">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actionTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Loading audit log...</div>
          </CardContent>
        </Card>
      ) : !filteredActions || filteredActions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-no-actions">
                No AI actions recorded yet. The AI will log changes here when it updates your data.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-4" data-testid="list-ai-actions">
            {filteredActions.map((action) => (
              <Card key={action.id} data-testid={`card-ai-action-${action.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={action.success ? "default" : "destructive"} data-testid={`badge-status-${action.id}`}>
                          {action.success ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          )}
                          {action.success ? "Success" : "Failed"}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-action-type-${action.id}`}>
                          {action.actionType}
                        </Badge>
                        <Badge variant="secondary" data-testid={`badge-table-${action.id}`}>
                          {action.targetTable}
                        </Badge>
                      </div>
                      <CardTitle className="text-base" data-testid={`text-reasoning-${action.id}`}>
                        {action.reasoning}
                      </CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-date-${action.id}`}>
                      {new Date(action.createdAt).toLocaleDateString()} {new Date(action.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {action.conversationContext && (
                      <div>
                        <div className="text-sm font-medium mb-1">User Message:</div>
                        <div className="text-sm text-muted-foreground bg-muted p-2 rounded" data-testid={`text-context-${action.id}`}>
                          {action.conversationContext}
                        </div>
                      </div>
                    )}

                    {action.changesBefore && (
                      <div>
                        <div className="text-sm font-medium mb-1">Before:</div>
                        <div className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto" data-testid={`text-before-${action.id}`}>
                          {JSON.stringify(action.changesBefore, null, 2)}
                        </div>
                      </div>
                    )}

                    {action.changesAfter && (
                      <div>
                        <div className="text-sm font-medium mb-1">After:</div>
                        <div className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto" data-testid={`text-after-${action.id}`}>
                          {JSON.stringify(action.changesAfter, null, 2)}
                        </div>
                      </div>
                    )}

                    {action.errorMessage && (
                      <div>
                        <div className="text-sm font-medium mb-1 text-destructive">Error:</div>
                        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded" data-testid={`text-error-${action.id}`}>
                          {action.errorMessage}
                        </div>
                      </div>
                    )}

                    {action.targetId && (
                      <div className="text-xs text-muted-foreground" data-testid={`text-target-id-${action.id}`}>
                        Target ID: {action.targetId}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
