import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Copy, CreditCard, TrendingUp, Users, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SubscriptionData {
  tier: string;
  status: string;
  billingCycle: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
}

interface UsageData {
  messagesUsed: number;
  limit: number;
  resetDate: string;
  tier: string;
  hasUnlimited: boolean;
}

interface ReferralStats {
  pending: number;
  converted: number;
  totalEarnings: number;
  rewardedCount: number;
}

interface UserData {
  referralCode: string | null;
}

export default function Billing() {
  const { toast } = useToast();

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
  });

  const { data: referralStats, isLoading: refLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
  });

  const { data: user } = useQuery<UserData>({
    queryKey: ["/api/auth/user"],
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ url: string }>("/api/stripe/create-portal-session", {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/subscriptions/cancel", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Subscription cancelled",
        description: "You'll have access until the end of your billing period",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/subscriptions/reactivate", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Subscription reactivated",
        description: "Your subscription will continue as normal",
      });
    },
  });

  const handleCopyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "enterprise":
        return "bg-purple-500 hover:bg-purple-600";
      case "premium":
        return "bg-blue-500 hover:bg-blue-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500 hover:bg-green-600";
      case "trialing":
        return "bg-blue-500 hover:bg-blue-600";
      case "canceled":
        return "bg-orange-500 hover:bg-orange-600";
      case "past_due":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  if (subLoading || usageLoading || refLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const usagePercentage = usage?.hasUnlimited ? 100 : ((usage?.messagesUsed || 0) / (usage?.limit || 1)) * 100;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="heading-billing">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription, usage, and referrals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Plan */}
        <Card data-testid="card-subscription">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan Tier</span>
              <Badge className={getTierBadgeColor(subscription?.tier || "free")} data-testid="badge-tier">
                {subscription?.tier?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={getStatusBadgeColor(subscription?.status || "active")} data-testid="badge-status">
                {subscription?.status?.toUpperCase()}
              </Badge>
            </div>
            {subscription?.billingCycle && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Billing Cycle</span>
                <span className="text-sm font-medium capitalize" data-testid="text-billing-cycle">
                  {subscription.billingCycle}
                </span>
              </div>
            )}
            {subscription?.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {subscription.cancelAtPeriodEnd ? "Access Until" : "Renews On"}
                </span>
                <span className="text-sm font-medium" data-testid="text-renewal-date">
                  {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
                </span>
              </div>
            )}
            {subscription?.trialEnd && new Date(subscription.trialEnd) > new Date() && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Trial ends {format(new Date(subscription.trialEnd), "MMM d, yyyy")}</span>
                </div>
              </div>
            )}
            {subscription?.cancelAtPeriodEnd && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Subscription cancelled. Access until {subscription.currentPeriodEnd ? format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy") : "period end"}.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending || subscription?.tier === "free"}
                data-testid="button-manage-payment"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Payment Method
              </Button>
              
              {subscription?.tier === "premium" && (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => window.location.href = "/pricing"}
                  data-testid="button-upgrade-enterprise"
                >
                  Upgrade to Enterprise
                </Button>
              )}
              
              {subscription?.cancelAtPeriodEnd ? (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                  data-testid="button-reactivate"
                >
                  Reactivate Subscription
                </Button>
              ) : subscription?.tier !== "free" && (
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card data-testid="card-usage">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>AI message usage statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">AI Messages</span>
                <span className="text-sm font-medium" data-testid="text-messages-used">
                  {usage?.messagesUsed || 0} {usage?.hasUnlimited ? "" : `/ ${usage?.limit || 50}`}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" data-testid="progress-usage" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan Type</span>
              <span className="text-sm font-medium">
                {usage?.hasUnlimited ? "Unlimited" : "Free Tier"}
              </span>
            </div>
            {!usage?.hasUnlimited && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Resets On</span>
                <span className="text-sm font-medium" data-testid="text-reset-date">
                  {usage?.resetDate ? format(new Date(usage.resetDate), "MMM d, yyyy") : "N/A"}
                </span>
              </div>
            )}
            {!usage?.hasUnlimited && (usage?.messagesUsed || 0) >= (usage?.limit || 50) * 0.8 && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  You're approaching your monthly limit. Upgrade for unlimited messages.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card data-testid="card-referrals">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referral Program
            </CardTitle>
            <CardDescription>Share your code and earn rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Your Referral Code</label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-secondary rounded-md font-mono text-lg font-bold" data-testid="text-referral-code">
                  {user?.referralCode || "N/A"}
                </div>
                <Button onClick={handleCopyReferralCode} variant="outline" size="icon" data-testid="button-copy-code">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold" data-testid="text-pending-referrals">{referralStats?.pending || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Converted</p>
                <p className="text-2xl font-bold" data-testid="text-converted-referrals">{referralStats?.converted || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings */}
        <Card data-testid="card-earnings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Referral Earnings
            </CardTitle>
            <CardDescription>Credits earned from referrals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-4xl font-bold" data-testid="text-total-earnings">
                ${referralStats?.totalEarnings || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                {referralStats?.rewardedCount || 0} rewarded referral{(referralStats?.rewardedCount || 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-400">
                Earn $20 credit for each friend who subscribes to premium!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
