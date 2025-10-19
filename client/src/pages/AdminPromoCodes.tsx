import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Tag, Plus, Trash2, Power, Copy, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PromoCode {
  id: number;
  code: string;
  discountPercent: number;
  maxUses: number | null;
  usedCount: number;
  tierRestriction: string | null;
  description: string | null;
  expiresAt: string | null;
  isActive: number;
  createdAt: string;
}

const promoCodeSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20).toUpperCase(),
  discountPercent: z.coerce.number().min(1, "Discount must be at least 1%").max(100, "Discount cannot exceed 100%"),
  maxUses: z.coerce.number().min(1).optional().nullable(),
  tierRestriction: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type PromoCodeForm = z.infer<typeof promoCodeSchema>;

export default function AdminPromoCodes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const form = useForm<PromoCodeForm>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      code: "",
      discountPercent: 10,
      maxUses: null,
      tierRestriction: null,
      description: "",
      expiresAt: "",
      isActive: true,
    },
  });

  const { data: promoCodes, isLoading } = useQuery<PromoCode[]>({
    queryKey: ["/api/admin/promo-codes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: PromoCodeForm) => {
      await apiRequest("POST", "/api/admin/promo-codes", {
        ...data,
        isActive: data.isActive ? 1 : 0,
        expiresAt: data.expiresAt || null,
        maxUses: data.maxUses || null,
        tierRestriction: data.tierRestriction || null,
        description: data.description || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      form.reset();
      toast({
        title: "Promo Code Created",
        description: "The promo code has been successfully created",
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

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/promo-codes/${id}`, {
        isActive: isActive ? 1 : 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({
        title: "Status Updated",
        description: "Promo code status has been updated",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/promo-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({
        title: "Promo Code Deleted",
        description: "The promo code has been permanently removed",
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

  const onSubmit = (data: PromoCodeForm) => {
    createMutation.mutate(data);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied!",
      description: `Promo code "${code}" copied to clipboard`,
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin")}
          data-testid="button-back-admin"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Tag className="w-8 h-8 text-primary" data-testid="icon-promo" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-promo-title">Promo Code Management</h1>
          <p className="text-muted-foreground" data-testid="text-promo-description">
            Create and manage promotional discount codes
          </p>
        </div>
      </div>

      <Card data-testid="card-create-promo">
        <CardHeader>
          <CardTitle data-testid="text-create-title">
            <Plus className="w-5 h-5 inline mr-2" />
            Create New Promo Code
          </CardTitle>
          <CardDescription data-testid="text-create-description">
            Generate a new promotional discount code with custom settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promo Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="WELCOME20"
                          className="uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          data-testid="input-promo-code"
                        />
                      </FormControl>
                      <FormDescription>
                        Unique code (3-20 characters, auto-uppercase)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Percentage</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="100"
                          placeholder="10"
                          data-testid="input-discount-percent"
                        />
                      </FormControl>
                      <FormDescription>
                        Discount amount (1-100%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Uses (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          placeholder="100"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          data-testid="input-max-uses"
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for unlimited uses
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tierRestriction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier Restriction (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-tier-restriction">
                            <SelectValue placeholder="All tiers" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">All tiers</SelectItem>
                          <SelectItem value="premium">Premium only</SelectItem>
                          <SelectItem value="enterprise">Enterprise only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Restrict to specific subscription tier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="datetime-local"
                          value={field.value || ""}
                          data-testid="input-expires-at"
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for no expiration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Welcome offer for new users"
                          value={field.value || ""}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Internal note about this code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Enable this code for immediate use
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full md:w-auto"
                data-testid="button-create-code"
              >
                <Plus className="mr-2 h-4 w-4" />
                {createMutation.isPending ? "Creating..." : "Create Promo Code"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card data-testid="card-promo-list">
        <CardHeader>
          <CardTitle data-testid="text-list-title">All Promo Codes</CardTitle>
          <CardDescription data-testid="text-list-description">
            View and manage existing promotional codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : promoCodes && promoCodes.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((promo) => (
                    <TableRow key={promo.id} data-testid={`row-promo-${promo.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold" data-testid={`text-code-${promo.id}`}>
                            {promo.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyCode(promo.code)}
                            data-testid={`button-copy-${promo.id}`}
                          >
                            {copiedCode === promo.code ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {promo.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {promo.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-discount-${promo.id}`}>
                        <Badge variant="secondary">{promo.discountPercent}% off</Badge>
                      </TableCell>
                      <TableCell data-testid={`text-usage-${promo.id}`}>
                        <span className="text-sm">
                          {promo.usedCount} / {promo.maxUses || "∞"}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-tier-${promo.id}`}>
                        <span className="text-sm text-muted-foreground">
                          {promo.tierRestriction || "All"}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-expires-${promo.id}`}>
                        {promo.expiresAt ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(promo.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={promo.isActive ? "default" : "secondary"}
                          data-testid={`badge-status-${promo.id}`}
                        >
                          {promo.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleMutation.mutate({ id: promo.id, isActive: !promo.isActive })}
                            disabled={toggleMutation.isPending}
                            data-testid={`button-toggle-${promo.id}`}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(promo.id)}
                            disabled={deleteMutation.isPending}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${promo.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-codes">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No promo codes created yet</p>
              <p className="text-sm">Create your first promo code using the form above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
