import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Users, TrendingUp, FileText, Activity, Search, Trash2, ChefHat, Tag, ArrowRight, Layout, DollarSign, Image, Play, FlaskConical, Wrench, TestTube, Settings, Mic, Sliders, Stethoscope, Dumbbell, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  enterpriseUsers: number;
  totalRecords: number;
  totalBiomarkers: number;
}

interface UsersResponse {
  users: User[];
  total: number;
}

interface ToggleSettingResponse {
  enabled: boolean;
  message: string;
}

interface ExerciseResolverOutput {
  canonical_id?: string;
  exercise_name?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SymptomAssessmentResult {
  assessment: {
    triage?: {
      level?: string;
      reason?: string;
    };
    differential?: Array<{
      label: string;
      confidence: number;
      key_evidence?: string[];
      recommendations?: string[];
    }>;
    explanation?: {
      ignored_stale?: string[];
    };
  };
  input?: {
    vitalsCollected?: boolean;
    biomarkersCount?: number;
  };
}

interface InsightsResult {
  insights: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
}

interface TestRunResponse {
  success: boolean;
  output?: string;
  errors?: string;
}

interface TeachAliasResponse {
  message: string;
}

interface GenerateInsightsResponse {
  result: {
    insightsGenerated?: number;
    metricsAnalyzed?: number;
  };
}

function AdminContent() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [plannerOutput, setPlannerOutput] = useState<string | null>(null);
  const [plannerDialogOpen, setPlannerDialogOpen] = useState(false);
  const [exerciseResolverTestName, setExerciseResolverTestName] = useState("");
  const [exerciseResolverTeachAIName, setExerciseResolverTeachAIName] = useState("");
  const [exerciseResolverTeachCanonicalId, setExerciseResolverTeachCanonicalId] = useState("");
  const [exerciseResolverOutput, setExerciseResolverOutput] = useState<ExerciseResolverOutput | null>(null);
  const [exerciseResolverDialogOpen, setExerciseResolverDialogOpen] = useState(false);
  const [insightsResult, setInsightsResult] = useState<InsightsResult | null>(null);
  const [symptomUserId, setSymptomUserId] = useState("");
  const [symptomText, setSymptomText] = useState("");
  const [symptomSeverity, setSymptomSeverity] = useState("");
  const [symptomContext, setSymptomContext] = useState("");
  const [symptomAssessmentResult, setSymptomAssessmentResult] = useState<SymptomAssessmentResult | null>(null);
  const limit = 20;
  const { toast} = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: stepCorrectionSetting } = useQuery<{ enabled: boolean; description?: string }>({
    queryKey: ["/api/admin/settings/step-correction"],
  });

  const toggleStepCorrectionMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/admin/settings/step-correction", { enabled });
      return await res.json();
    },
    onSuccess: (data: ToggleSettingResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/step-correction"] });
      toast({
        title: data.enabled ? "Step Correction Enabled" : "Step Correction Disabled",
        description: data.message,
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

  const { data: googleDriveSetting } = useQuery<{ enabled: boolean; description?: string }>({
    queryKey: ["/api/admin/settings/google-drive"],
  });

  const toggleGoogleDriveMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/admin/settings/google-drive", { enabled });
      return await res.json();
    },
    onSuccess: (data: ToggleSettingResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/google-drive"] });
      toast({
        title: data.enabled ? "Google Drive Enabled" : "Google Drive Disabled",
        description: data.message,
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

  const { data: webhookSetting } = useQuery<{ enabled: boolean; description?: string }>({
    queryKey: ["/api/admin/settings/webhook-integration"],
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/admin/settings/webhook-integration", { enabled });
      return await res.json();
    },
    onSuccess: (data: ToggleSettingResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/webhook-integration"] });
      toast({
        title: data.enabled ? "Webhook Integration Enabled" : "Webhook Integration Disabled",
        description: data.message,
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

  const { data: usersData, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ["/api/admin/users", page, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/users/${userId}`, { role: newRole });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSubscriptionChange = async (userId: string, newTier: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/users/${userId}`, { subscriptionTier: newTier });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Subscription Updated",
        description: `Subscription tier changed to ${newTier}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setEmailConfirmation("");
      toast({
        title: "User Deleted",
        description: "User and all associated data have been permanently removed",
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

  const runTestsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/workout-planner/run-tests");
      return await res.json();
    },
    onSuccess: (data: TestRunResponse) => {
      setPlannerOutput(data.output || data.errors || '');
      setPlannerDialogOpen(true);
      toast({
        title: data.success ? "Tests Complete" : "Tests Failed",
        description: data.success ? "All tests passed successfully" : "Some tests failed",
        variant: data.success ? "default" : "destructive",
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

  const runDemoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/workout-planner/run-demo");
      return await res.json();
    },
    onSuccess: (data: TestRunResponse) => {
      setPlannerOutput(data.output || data.errors || '');
      setPlannerDialogOpen(true);
      toast({
        title: data.success ? "Demo Complete" : "Demo Failed",
        description: data.success ? "Demo ran successfully" : "Demo encountered errors",
        variant: data.success ? "default" : "destructive",
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

  const testExerciseResolverMutation = useMutation({
    mutationFn: async (exerciseName: string) => {
      const res = await apiRequest("POST", "/api/admin/exercise-resolver/test", { exerciseName });
      return await res.json();
    },
    onSuccess: (data: ExerciseResolverOutput) => {
      setExerciseResolverOutput(data);
      setExerciseResolverDialogOpen(true);
      toast({
        title: "Test Complete",
        description: `Tested exercise name resolution`,
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

  const teachAliasMutation = useMutation({
    mutationFn: async ({ aiName, canonicalId }: { aiName: string; canonicalId: string }) => {
      const res = await apiRequest("POST", "/api/admin/exercise-resolver/teach-alias", { aiName, canonicalId });
      return await res.json();
    },
    onSuccess: (data: TeachAliasResponse) => {
      setExerciseResolverTeachAIName("");
      setExerciseResolverTeachCanonicalId("");
      toast({
        title: "Alias Taught Successfully",
        description: data.message,
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

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/insights/generate-v2");
      return await res.json();
    },
    onSuccess: (data: GenerateInsightsResponse) => {
      setInsightsResult(data.result as unknown as InsightsResult);
      toast({
        title: "✅ Insights Generated",
        description: `Created ${data.result?.insightsGenerated || 0} insights from ${data.result?.metricsAnalyzed || 0} metrics`,
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

  const runSymptomAssessmentMutation = useMutation({
    mutationFn: async ({ userId, symptomText, severity, context }: { 
      userId: string; 
      symptomText: string; 
      severity?: number; 
      context?: string[] 
    }) => {
      const res = await apiRequest("POST", `/api/admin/symptom-assessment/${userId}`, {
        symptomText,
        severity,
        context: context || [],
      });
      return await res.json();
    },
    onSuccess: (data: SymptomAssessmentResult) => {
      setSymptomAssessmentResult(data);
      toast({
        title: "✅ Assessment Complete",
        description: `Triage: ${data.assessment?.differential?.length || 0} possible causes identified`,
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

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setEmailConfirmation("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = () => {
    if (userToDelete && emailConfirmation === userToDelete.email) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const totalPages = usersData ? Math.ceil(usersData.total / limit) : 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" data-testid="icon-admin" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Control Panel</h1>
          <p className="text-muted-foreground" data-testid="text-admin-description">
            Manage users, subscriptions, and platform settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="cms" data-testid="tab-cms">
            <Layout className="h-4 w-4 mr-2" />
            CMS
          </TabsTrigger>
          <TabsTrigger value="diagnostics" data-testid="tab-diagnostics">
            <Wrench className="h-4 w-4 mr-2" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* User Numbers Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">User Numbers</h2>
            {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="card-stat-total-users">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">
                {stats?.totalUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-active-users">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-users">
                {stats?.activeUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">With health data</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-premium-users">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-premium-users">
                {stats?.premiumUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Premium tier</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-enterprise-users">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enterprise Users</CardTitle>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-enterprise-users">
                {stats?.enterpriseUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Enterprise tier</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-total-records">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Records</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-records">
                {stats?.totalRecords || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total documents</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-total-biomarkers">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Biomarkers</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-biomarkers">
                {stats?.totalBiomarkers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Data points tracked</p>
            </CardContent>
          </Card>
        </div>
      )}
          </div>

          {/* User Management Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">User Management</h2>
            <Card data-testid="card-user-management">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(0);
                    }}
                    className="max-w-sm"
                    data-testid="input-user-search"
                  />
                </div>

                {usersLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    <ScrollArea className="w-full">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead data-testid="table-head-user">User</TableHead>
                              <TableHead data-testid="table-head-role">Role</TableHead>
                              <TableHead data-testid="table-head-subscription">Subscription</TableHead>
                              <TableHead data-testid="table-head-status">Status</TableHead>
                              <TableHead data-testid="table-head-actions">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {usersData?.users.map((user) => (
                              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                                <TableCell data-testid={`cell-user-info-${user.id}`}>
                                  <div>
                                    <div className="font-medium" data-testid={`text-user-name-${user.id}`}>
                                      {user.firstName} {user.lastName}
                                    </div>
                                    <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                                      {user.email}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell data-testid={`cell-user-role-${user.id}`}>
                                  <Select
                                    value={user.role}
                                    onValueChange={(value) => handleRoleChange(user.id, value)}
                                  >
                                    <SelectTrigger className="w-[120px]" data-testid={`select-role-${user.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user" data-testid={`option-role-user-${user.id}`}>User</SelectItem>
                                      <SelectItem value="admin" data-testid={`option-role-admin-${user.id}`}>Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell data-testid={`cell-user-subscription-${user.id}`}>
                                  <Select
                                    value={user.subscriptionTier}
                                    onValueChange={(value) => handleSubscriptionChange(user.id, value)}
                                  >
                                    <SelectTrigger className="w-[140px]" data-testid={`select-subscription-${user.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="free" data-testid={`option-tier-free-${user.id}`}>Free</SelectItem>
                                      <SelectItem value="premium" data-testid={`option-tier-premium-${user.id}`}>Premium</SelectItem>
                                      <SelectItem value="enterprise" data-testid={`option-tier-enterprise-${user.id}`}>Enterprise</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell data-testid={`cell-user-status-${user.id}`}>
                                  <Badge
                                    variant={user.subscriptionStatus === "active" ? "default" : "secondary"}
                                    data-testid={`badge-status-${user.id}`}
                                  >
                                    {user.subscriptionStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell data-testid={`cell-user-actions-${user.id}`}>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      data-testid={`button-view-user-${user.id}`}
                                    >
                                      View Details
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDeleteDialog(user)}
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-delete-user-${user.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                          Showing {page * limit + 1} to {Math.min((page + 1) * limit, usersData?.total || 0)} of{" "}
                          {usersData?.total || 0} users
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            data-testid="button-prev-page"
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                            data-testid="button-next-page"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Promo Code Management Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Promo Code Management</h2>
            <Card data-testid="card-promo-codes-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/promo-codes")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle data-testid="text-promo-codes-link-title">Promo Code Management</CardTitle>
                      <CardDescription data-testid="text-promo-codes-link-description">
                        Create and manage promotional discount codes
                      </CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Generate promo codes with custom discounts, usage limits, expiration dates, and tier restrictions
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CMS Tab */}
        <TabsContent value="cms" className="space-y-6">
          <Card data-testid="card-landing-page-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/landing-page")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layout className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle data-testid="text-landing-page-link-title">Landing Page CMS</CardTitle>
                    <CardDescription data-testid="text-landing-page-link-description">
                      Manage landing page content and sections
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Edit hero content, features, testimonials, pricing plans, social links, and SEO metadata
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-cost-control-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/cost")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle data-testid="text-cost-control-link-title">Cost Control Dashboard</CardTitle>
                    <CardDescription data-testid="text-cost-control-link-description">
                      Monitor resource usage and manage platform costs
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track LLM API usage, job execution costs, user spending patterns, and configure budget caps
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-toggles">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sliders className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle data-testid="text-feature-toggles-title">Feature Toggles</CardTitle>
                  <CardDescription data-testid="text-feature-toggles-description">
                    Enable or disable features before launch
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="google-drive-toggle" className="text-sm font-medium">
                    Google Drive Integration
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show Google Drive tile in Health Records page
                  </p>
                </div>
                <Switch
                  id="google-drive-toggle"
                  data-testid="switch-google-drive"
                  checked={googleDriveSetting?.enabled ?? false}
                  onCheckedChange={(checked) => toggleGoogleDriveMutation.mutate(checked)}
                  disabled={toggleGoogleDriveMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="webhook-toggle" className="text-sm font-medium">
                    Webhook Integration
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show webhook/Health Auto Export setup in Apple Health integration
                  </p>
                </div>
                <Switch
                  id="webhook-toggle"
                  data-testid="switch-webhook"
                  checked={webhookSetting?.enabled ?? false}
                  onCheckedChange={(checked) => toggleWebhookMutation.mutate(checked)}
                  disabled={toggleWebhookMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-6">
          {/* System Settings */}
          <Card data-testid="card-system-settings">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <div>
              <CardTitle data-testid="text-system-settings-title">System Settings</CardTitle>
              <CardDescription data-testid="text-system-settings-description">
                Configure global platform settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="step-correction-toggle" className="text-sm font-medium">
                Step Count Correction
              </Label>
              <p className="text-xs text-muted-foreground">
                {stepCorrectionSetting?.description || 'Apply 0.7x correction factor to compensate for multi-source overcounting'}
              </p>
            </div>
            <Switch
              id="step-correction-toggle"
              data-testid="switch-step-correction"
              checked={stepCorrectionSetting?.enabled ?? true}
              onCheckedChange={(checked) => toggleStepCorrectionMutation.mutate(checked)}
              disabled={toggleStepCorrectionMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-meal-library-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/meal-library")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="w-6 h-6 text-primary" />
              <div>
                <CardTitle data-testid="text-meal-library-link-title">Meal Library Management</CardTitle>
                <CardDescription data-testid="text-meal-library-link-description">
                  Manage meal inventory, import from Spoonacular, and optimize costs
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Import bulk meals, track performance metrics, manage deletion queue with premium user protection, and configure library settings
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-promo-codes-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/promo-codes")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="w-6 h-6 text-primary" />
              <div>
                <CardTitle data-testid="text-promo-codes-link-title">Promo Code Management</CardTitle>
                <CardDescription data-testid="text-promo-codes-link-description">
                  Create and manage promotional discount codes
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Generate promo codes with custom discounts, usage limits, expiration dates, and tier restrictions
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-landing-page-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/landing-page")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layout className="w-6 h-6 text-primary" />
              <div>
                <CardTitle data-testid="text-landing-page-link-title">Landing Page CMS</CardTitle>
                <CardDescription data-testid="text-landing-page-link-description">
                  Manage landing page content and sections
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Edit hero content, features, testimonials, pricing plans, social links, and SEO metadata
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-media-review-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/media-review")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image className="w-6 h-6 text-primary" />
              <div>
                <CardTitle data-testid="text-media-review-link-title">Exercise Media Review</CardTitle>
                <CardDescription data-testid="text-media-review-link-description">
                  Review and approve exercise-to-GIF matches
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manually review low-confidence exercise media matches, approve correct mappings, and improve the scoring algorithm through labeled data
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-cost-control-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/cost")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-primary" />
              <div>
                <CardTitle data-testid="text-cost-control-link-title">Cost Control Dashboard</CardTitle>
                <CardDescription data-testid="text-cost-control-link-description">
                  Monitor resource usage and manage platform costs
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Track LLM API usage, job execution costs, user spending patterns, and configure budget caps
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-diagnostics-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/diagnostics")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-primary" />
              <div>
                <CardTitle data-testid="text-diagnostics-link-title">Platform Diagnostics</CardTitle>
                <CardDescription data-testid="text-diagnostics-link-description">
                  Debug native app platform detection and permissions
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            View Capacitor platform info, microphone permissions, and troubleshoot native iOS app issues
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-voice-chat-test-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/voice-chat-simple")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className="w-6 h-6 text-primary" />
              <div>
                <CardTitle data-testid="text-voice-chat-test-link-title">Voice Chat Microphone Test</CardTitle>
                <CardDescription data-testid="text-voice-chat-test-link-description">
                  Test microphone access with detailed error reporting
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Step-by-step microphone test that shows exactly what&apos;s failing and how to fix it
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-workout-planner-tools">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Dumbbell className="w-6 h-6 text-primary" />
            <div>
              <CardTitle data-testid="text-workout-planner-tools-title">Workout Planner Tools</CardTitle>
              <CardDescription data-testid="text-workout-planner-tools-description">
                Run tests and demo for the deterministic workout planner
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Test the rule-based workout planning system that demonstrates readiness scaling, health profile integration, goal-based selection, and training rules.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => runTestsMutation.mutate()}
              disabled={runTestsMutation.isPending}
              data-testid="button-run-planner-tests"
              variant="default"
            >
              {runTestsMutation.isPending ? (
                <>
                  <FlaskConical className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Run Tests
                </>
              )}
            </Button>
            <Button
              onClick={() => runDemoMutation.mutate()}
              disabled={runDemoMutation.isPending}
              data-testid="button-run-planner-demo"
              variant="outline"
            >
              {runDemoMutation.isPending ? (
                <>
                  <Play className="w-4 h-4 mr-2 animate-spin" />
                  Running Demo...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Demo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-insights-generator">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <CardTitle data-testid="text-insights-generator-title">Daily Health Insights Generator</CardTitle>
              <CardDescription data-testid="text-insights-generator-description">
                Manually trigger insights generation for the current user
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate daily insights by analyzing metrics, symptoms, and health patterns. The system compares current values to baseline and creates AI-powered recommendations.
          </p>
          <Button
            onClick={() => generateInsightsMutation.mutate()}
            disabled={generateInsightsMutation.isPending}
            data-testid="button-generate-insights"
            variant="default"
          >
            {generateInsightsMutation.isPending ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating Insights...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Insights Now
              </>
            )}
          </Button>

          {insightsResult && (
            <div className="mt-4 p-4 rounded-md border bg-card space-y-2" data-testid="panel-insights-results">
              <p className="text-sm font-medium">Generation Results:</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Metrics Analyzed</p>
                  <p className="font-semibold" data-testid="text-metrics-analyzed">{insightsResult.metricsAnalyzed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Insights Generated</p>
                  <p className="font-semibold text-primary" data-testid="text-insights-generated">{insightsResult.insightsGenerated}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Symptom Insights</p>
                  <p className="font-semibold" data-testid="text-symptom-insights">{insightsResult.symptomInsightsGenerated || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold" data-testid="text-insights-date">{insightsResult.date}</p>
                </div>
              </div>
              {insightsResult.errors && insightsResult.errors.length > 0 && (
                <div className="mt-3 p-3 rounded bg-destructive/10 border border-destructive/20" data-testid="panel-insights-errors">
                  <p className="text-sm font-medium text-destructive">Errors:</p>
                  <ul className="text-xs text-destructive mt-1 space-y-1">
                    {insightsResult.errors.map((err: string, i: number) => (
                      <li key={i} data-testid={`text-error-${i}`}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-symptom-assessment-tool">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            <div>
              <CardTitle data-testid="text-symptom-assessment-title">Symptom Assessment Workflow</CardTitle>
              <CardDescription data-testid="text-symptom-assessment-description">
                Test medical-grade symptom triage with freshness-aware data filtering
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Run the workflow assessor engine that correlates symptoms with recent vitals (≤72h) and biomarkers (≤60d) using evidence-based pattern scoring and safety-first triage (urgent_now / gp_24_72h / self_care).
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Enter user ID to assess"
                value={symptomUserId}
                onChange={(e) => setSymptomUserId(e.target.value)}
                data-testid="input-symptom-user-id"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Symptoms (free text)</label>
              <Input
                placeholder="e.g., 'short of breath and chest tight' or 'headache, poor sleep'"
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                data-testid="input-symptom-text"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Severity (0-10, optional)</label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="0-10"
                  value={symptomSeverity}
                  onChange={(e) => setSymptomSeverity(e.target.value)}
                  data-testid="input-symptom-severity"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Context Tags (optional)</label>
                <Input
                  placeholder="e.g., after_workout,poor_sleep"
                  value={symptomContext}
                  onChange={(e) => setSymptomContext(e.target.value)}
                  data-testid="input-symptom-context"
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              onClick={() => {
                if (symptomUserId.trim() && symptomText.trim()) {
                  runSymptomAssessmentMutation.mutate({
                    userId: symptomUserId.trim(),
                    symptomText: symptomText.trim(),
                    severity: symptomSeverity ? parseInt(symptomSeverity) : undefined,
                    context: symptomContext ? symptomContext.split(',').map(c => c.trim()).filter(Boolean) : [],
                  });
                }
              }}
              disabled={runSymptomAssessmentMutation.isPending || !symptomUserId.trim() || !symptomText.trim()}
              data-testid="button-run-symptom-assessment"
              variant="default"
              className="w-full"
            >
              {runSymptomAssessmentMutation.isPending ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Run Symptom Assessment
                </>
              )}
            </Button>

            {symptomAssessmentResult && (
              <div className="mt-4 p-4 rounded-md border bg-card space-y-3" data-testid="panel-symptom-results">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">Assessment Results</p>
                  <Badge 
                    variant={
                      symptomAssessmentResult.assessment?.triage?.level === "urgent_now" ? "destructive" :
                      symptomAssessmentResult.assessment?.triage?.level === "gp_24_72h" ? "default" : "secondary"
                    }
                    data-testid="badge-triage-level"
                  >
                    {symptomAssessmentResult.assessment?.triage?.level?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="text-sm space-y-2">
                  <div>
                    <p className="text-muted-foreground">Triage Reason:</p>
                    <p className="font-medium" data-testid="text-triage-reason">
                      {symptomAssessmentResult.assessment?.triage?.reason}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Vitals/Biomarkers Collected:</p>
                    <p className="font-medium" data-testid="text-data-collected">
                      {symptomAssessmentResult.input?.vitalsCollected ? 'Yes' : 'No'} (vitals), {symptomAssessmentResult.input?.biomarkersCount || 0} biomarkers
                    </p>
                  </div>

                  {symptomAssessmentResult.assessment?.differential && symptomAssessmentResult.assessment.differential.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-2">Possible Causes:</p>
                      {symptomAssessmentResult.assessment.differential.map((diff, idx) => (
                        <div key={idx} className="ml-3 mb-2 p-2 rounded bg-muted/50" data-testid={`panel-differential-${idx}`}>
                          <p className="font-medium">{diff.label} ({(diff.confidence * 100).toFixed(0)}% confidence)</p>
                          <p className="text-xs text-muted-foreground mt-1">Evidence: {diff.key_evidence?.join(', ')}</p>
                          {diff.recommendations && diff.recommendations.length > 0 && (
                            <ul className="text-xs mt-1 space-y-0.5">
                              {diff.recommendations.map((rec: string, i: number) => (
                                <li key={i}>• {rec}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {symptomAssessmentResult.assessment?.explanation?.ignored_stale?.length > 0 && (
                    <div className="text-xs">
                      <p className="text-muted-foreground">Stale Data Ignored:</p>
                      <p className="font-mono" data-testid="text-ignored-stale">
                        {symptomAssessmentResult.assessment.explanation.ignored_stale.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-exercise-resolver-tools">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-primary" />
            <div>
              <CardTitle data-testid="text-exercise-resolver-tools-title">Exercise Resolver Tools</CardTitle>
              <CardDescription data-testid="text-exercise-resolver-tools-description">
                Test AI exercise name resolution and teach aliases
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Test Exercise Name Resolution</p>
            <p className="text-sm text-muted-foreground">
              Test how the resolver matches AI-generated exercise names to canonical database exercises.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter exercise name (e.g., 'barbell squat', 'db bench', 'rdl')"
                value={exerciseResolverTestName}
                onChange={(e) => setExerciseResolverTestName(e.target.value)}
                data-testid="input-exercise-resolver-test-name"
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (exerciseResolverTestName.trim()) {
                    testExerciseResolverMutation.mutate(exerciseResolverTestName.trim());
                  }
                }}
                disabled={testExerciseResolverMutation.isPending || !exerciseResolverTestName.trim()}
                data-testid="button-test-exercise-resolver"
                variant="default"
              >
                {testExerciseResolverMutation.isPending ? (
                  <>
                    <TestTube className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Test
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Teach New Alias</p>
            <p className="text-sm text-muted-foreground">
              Teach the resolver to map an AI name to a canonical exercise ID.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="AI name (e.g., 'bb squat')"
                value={exerciseResolverTeachAIName}
                onChange={(e) => setExerciseResolverTeachAIName(e.target.value)}
                data-testid="input-exercise-resolver-teach-ai-name"
                className="flex-1"
              />
              <Input
                placeholder="Canonical exercise ID"
                value={exerciseResolverTeachCanonicalId}
                onChange={(e) => setExerciseResolverTeachCanonicalId(e.target.value)}
                data-testid="input-exercise-resolver-teach-canonical-id"
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (exerciseResolverTeachAIName.trim() && exerciseResolverTeachCanonicalId.trim()) {
                    teachAliasMutation.mutate({
                      aiName: exerciseResolverTeachAIName.trim(),
                      canonicalId: exerciseResolverTeachCanonicalId.trim()
                    });
                  }
                }}
                disabled={teachAliasMutation.isPending || !exerciseResolverTeachAIName.trim() || !exerciseResolverTeachCanonicalId.trim()}
                data-testid="button-teach-exercise-alias"
                variant="outline"
              >
                {teachAliasMutation.isPending ? (
                  <>
                    <Wrench className="w-4 h-4 mr-2 animate-spin" />
                    Teaching...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Teach
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-diagnostics-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/diagnostics")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-primary" />
              <div>
                <CardTitle data-testid="text-diagnostics-link-title">Platform Diagnostics</CardTitle>
                <CardDescription data-testid="text-diagnostics-link-description">
                  Debug native app platform detection and permissions
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            View Capacitor platform info, microphone permissions, and troubleshoot native iOS app issues
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-voice-chat-test-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/voice-chat-simple")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className="w-6 h-4 mr-2" />
              <div>
                <CardTitle data-testid="text-voice-chat-test-link-title">Voice Chat Microphone Test</CardTitle>
                <CardDescription data-testid="text-voice-chat-test-link-description">
                  Test microphone access with detailed error reporting
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Step-by-step microphone test that shows exactly what&apos;s failing and how to fix it
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-healthkit-diagnostics-link" className="hover-elevate cursor-pointer" onClick={() => setLocation("/healthkit-diagnostics")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Stethoscope className="w-6 h-6 text-primary" />
              <div>
                <CardTitle data-testid="text-healthkit-diagnostics-link-title">HealthKit Diagnostics</CardTitle>
                <CardDescription data-testid="text-healthkit-diagnostics-link-description">
                  Debug HealthKit integration and data sync
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            View HealthKit permissions, sync status, and troubleshoot data import issues
          </p>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-user">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-dialog-title">
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-dialog-description">
              This action cannot be undone. This will permanently delete the user account and remove all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Health records and uploaded documents</li>
                <li>Biomarker data and tracking history</li>
                <li>Meal plans and training schedules</li>
                <li>Chat history and AI conversations</li>
                <li>All personal information</li>
              </ul>
              <div className="mt-4 space-y-2">
                <p className="font-semibold">
                  To confirm, please type the user&apos;s email address:
                </p>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {userToDelete?.email}
                </p>
                <Input
                  placeholder="Enter email to confirm"
                  value={emailConfirmation}
                  onChange={(e) => setEmailConfirmation(e.target.value)}
                  data-testid="input-delete-confirmation"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={emailConfirmation !== userToDelete?.email || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={plannerDialogOpen} onOpenChange={setPlannerDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-planner-output">
          <DialogHeader>
            <DialogTitle data-testid="text-planner-dialog-title">Workout Planner Output</DialogTitle>
            <DialogDescription data-testid="text-planner-dialog-description">
              Results from running the workout planner tools
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap" data-testid="text-planner-output">
              {plannerOutput}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={exerciseResolverDialogOpen} onOpenChange={setExerciseResolverDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="dialog-exercise-resolver-output">
          <DialogHeader>
            <DialogTitle data-testid="text-exercise-resolver-dialog-title">Exercise Resolver Test Results</DialogTitle>
            <DialogDescription data-testid="text-exercise-resolver-dialog-description">
              Results from testing the exercise name resolution system
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap" data-testid="text-exercise-resolver-output">
              {JSON.stringify(exerciseResolverOutput, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Admin() {
  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/user"] });

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <AdminContent />;
}
