import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, DollarSign, Activity, Zap, TrendingUp, TrendingDown, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CostSummary {
  totalCost: number;
  totalJobs: number;
  totalAiCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  dailyData: Array<{
    date: string;
    cost: number;
    jobs: number;
    aiCalls: number;
    tierBreakdown: Record<string, number>;
  }>;
}

interface TopUser {
  userId: string;
  user: {
    email?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  totalCost: number;
  jobs: number;
  aiCalls: number;
  tier: string;
}

interface CostBudget {
  id: number;
  dailyCpuMsCap: number;
  dailyJobsCap: number;
  llmInputTokensCap: number;
  llmOutputTokensCap: number;
  applyScope: string;
  updatedBy: string | null;
  updatedAt: string;
}

const budgetSchema = z.object({
  applyScope: z.string().min(1, "Scope is required"),
  dailyCpuMsCap: z.coerce.number().min(0, "Must be non-negative"),
  dailyJobsCap: z.coerce.number().min(0, "Must be non-negative"),
  llmInputTokensCap: z.coerce.number().min(0, "Must be non-negative"),
  llmOutputTokensCap: z.coerce.number().min(0, "Must be non-negative"),
});

type BudgetForm = z.infer<typeof budgetSchema>;

export default function AdminCostDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"7" | "30">("7");

  const form = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      applyScope: "global",
      dailyCpuMsCap: 100000000,
      dailyJobsCap: 10000,
      llmInputTokensCap: 1000000,
      llmOutputTokensCap: 500000,
    },
  });

  // Fetch cost summary
  const { data: costSummary } = useQuery<CostSummary>({
    queryKey: ["/api/admin/cost/summary", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/cost/summary?days=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch cost summary");
      return response.json();
    },
  });

  // Fetch top users
  const { data: topUsers, isLoading: usersLoading } = useQuery<TopUser[]>({
    queryKey: ["/api/admin/cost/users", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/cost/users?days=${timeRange}&limit=25`);
      if (!response.ok) throw new Error("Failed to fetch top users");
      return response.json();
    },
  });

  // Fetch budgets
  const { data: budgets } = useQuery<CostBudget[]>({
    queryKey: ["/api/admin/cost/budgets"],
  });

  // Budget mutation
  const budgetMutation = useMutation({
    mutationFn: async (data: BudgetForm) => {
      await apiRequest("POST", "/api/admin/cost/budgets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost/budgets"] });
      toast({
        title: "Budget Updated",
        description: "Cost budget has been successfully configured",
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

  // Prepare chart data for tier breakdown
  const tierChartData = costSummary?.dailyData.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    free: day.tierBreakdown?.free || 0,
    premium: day.tierBreakdown?.premium || 0,
    enterprise: day.tierBreakdown?.enterprise || 0,
    total: day.cost,
  })) || [];

  // Calculate trends
  const calculateTrend = (data: number[] | undefined) => {
    if (!data || data.length < 2) return 0;
    const recent = data.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, data.length);
    const older = data.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, data.length - 3);
    return older === 0 ? 0 : ((recent - older) / older) * 100;
  };

  const costTrend = calculateTrend(costSummary?.dailyData.map(d => d.cost));
  const jobsTrend = calculateTrend(costSummary?.dailyData.map(d => d.jobs));
  const aiTrend = calculateTrend(costSummary?.dailyData.map(d => d.aiCalls));

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back-to-admin"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Cost Dashboard</h1>
            <p className="text-muted-foreground">Monitor resource usage and manage budgets</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-end">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as "7" | "30")}>
            <SelectTrigger className="w-[180px]" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-cost">
                ${costSummary?.totalCost.toFixed(2) || '0.00'}
              </div>
              {costTrend !== 0 && (
                <p className={`text-xs flex items-center gap-1 ${costTrend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {costTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(costTrend).toFixed(1)}% from previous period
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-jobs">
                {costSummary?.totalJobs.toLocaleString() || '0'}
              </div>
              {jobsTrend !== 0 && (
                <p className={`text-xs flex items-center gap-1 ${jobsTrend > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {jobsTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(jobsTrend).toFixed(1)}% from previous period
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Calls</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-ai-calls">
                {costSummary?.totalAiCalls.toLocaleString() || '0'}
              </div>
              {aiTrend !== 0 && (
                <p className={`text-xs flex items-center gap-1 ${aiTrend > 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                  {aiTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(aiTrend).toFixed(1)}% from previous period
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LLM Tokens</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-tokens">
                {((costSummary?.totalTokensIn || 0) + (costSummary?.totalTokensOut || 0)).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {costSummary?.totalTokensIn.toLocaleString() || '0'} in / {costSummary?.totalTokensOut.toLocaleString() || '0'} out
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="cost" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cost">Cost Breakdown</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="tokens">LLM Tokens</TabsTrigger>
          </TabsList>

          <TabsContent value="cost" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Tier</CardTitle>
                <CardDescription>Daily cost breakdown across subscription tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tierChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(4)}`} />
                      <Legend />
                      <Area type="monotone" dataKey="free" stackId="1" stroke="#94a3b8" fill="#94a3b8" />
                      <Area type="monotone" dataKey="premium" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                      <Area type="monotone" dataKey="enterprise" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Executions</CardTitle>
                <CardDescription>Daily job execution volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costSummary?.dailyData.map(d => ({
                      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      jobs: d.jobs,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="jobs" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>LLM Token Usage</CardTitle>
                <CardDescription>Daily AI token consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={costSummary?.dailyData.map(d => ({
                      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      aiCalls: d.aiCalls,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="aiCalls" stroke="#8b5cf6" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Top Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Users by Cost</CardTitle>
            <CardDescription>Users with highest resource consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Jobs</TableHead>
                    <TableHead className="text-right">AI Calls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : topUsers && topUsers.length > 0 ? (
                    topUsers.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell className="font-medium">
                          {user.user?.email || user.userId.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            user.tier === 'enterprise' ? 'default' : 
                            user.tier === 'premium' ? 'secondary' : 
                            'outline'
                          }>
                            {user.tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">${user.totalCost.toFixed(4)}</TableCell>
                        <TableCell className="text-right">{user.jobs.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{user.aiCalls.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Budget Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Controls</CardTitle>
            <CardDescription>Set daily resource caps to manage costs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Budgets */}
            {budgets && budgets.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Current Budgets</h3>
                <div className="space-y-2">
                  {budgets.map((budget) => (
                    <div key={budget.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <div>
                        <Badge>{budget.applyScope}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Jobs: {budget.dailyJobsCap.toLocaleString()} | CPU: {budget.dailyCpuMsCap.toLocaleString()}ms | 
                          Tokens: {budget.llmInputTokensCap.toLocaleString()}/{budget.llmOutputTokensCap.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(budget.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budget Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => budgetMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="applyScope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apply To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-budget-scope">
                            <SelectValue placeholder="Select scope" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="global">Global</SelectItem>
                          <SelectItem value="free">Free Tier</SelectItem>
                          <SelectItem value="premium">Premium Tier</SelectItem>
                          <SelectItem value="enterprise">Enterprise Tier</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="dailyJobsCap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Jobs Cap</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10000" {...field} data-testid="input-jobs-cap" />
                        </FormControl>
                        <FormDescription>Maximum jobs per day</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dailyCpuMsCap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily CPU Cap (ms)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="100000000" {...field} data-testid="input-cpu-cap" />
                        </FormControl>
                        <FormDescription>Maximum CPU milliseconds per day</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="llmInputTokensCap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LLM Input Tokens Cap</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1000000" {...field} data-testid="input-input-tokens-cap" />
                        </FormControl>
                        <FormDescription>Maximum input tokens per day</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="llmOutputTokensCap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LLM Output Tokens Cap</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="500000" {...field} data-testid="input-output-tokens-cap" />
                        </FormControl>
                        <FormDescription>Maximum output tokens per day</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={budgetMutation.isPending} data-testid="button-save-budget">
                  {budgetMutation.isPending ? "Saving..." : "Save Budget"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
