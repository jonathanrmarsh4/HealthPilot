import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Shield, Users, TrendingUp, FileText, Activity, Search, Trash2, ChefHat, ArrowRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function Admin() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const limit = 20;
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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

      <Card data-testid="card-user-management">
        <CardHeader>
          <CardTitle data-testid="text-user-management-title">User Management</CardTitle>
          <CardDescription data-testid="text-user-management-description">
            View and manage user accounts, roles, and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  To confirm, please type the user's email address:
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
    </div>
  );
}
