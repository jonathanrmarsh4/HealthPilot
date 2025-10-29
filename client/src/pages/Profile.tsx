import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, User, Heart, CreditCard, Settings, MapPin, Dumbbell, ArrowRight, Sparkles, Crown } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useLocale } from "@/contexts/LocaleContext";
import { convertValue, unitConfigs } from "@/lib/unitConversions";
import { useTimezone } from "@/contexts/TimezoneContext";
import { Label } from "@/components/ui/label";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Badge } from "@/components/ui/badge";

const COMMON_TIMEZONES = [
  { value: "Pacific/Auckland", label: "Auckland (GMT+12)" },
  { value: "Australia/Sydney", label: "Sydney (GMT+10)" },
  { value: "Australia/Brisbane", label: "Brisbane (GMT+10)" },
  { value: "Australia/Perth", label: "Perth (GMT+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Europe/London", label: "London (GMT+0)" },
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "America/Chicago", label: "Chicago (GMT-6)" },
  { value: "America/Denver", label: "Denver (GMT-7)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8)" },
  { value: "UTC", label: "UTC (GMT+0)" },
];

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  height: z.string().transform(val => val ? parseFloat(val) : null),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  activityLevel: z.string().optional(),
  location: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  timezone: string;
  height: number | null;
  dateOfBirth: Date | null;
  gender: string | null;
  bloodType: string | null;
  activityLevel: string | null;
  location: string | null;
  latestWeight: { value: number; unit: string } | null;
}

export default function Profile() {
  const { toast } = useToast();
  const { unitSystem } = useLocale();
  const { timezone, setTimezone } = useTimezone();
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string }>>([]);
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    setSelectedTimezone(timezone);
  }, [timezone]);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: profile ? {
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      height: profile.height?.toString() || "",
      dateOfBirth: profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "yyyy-MM-dd") : "",
      gender: profile.gender || "",
      bloodType: profile.bloodType || "",
      activityLevel: profile.activityLevel || "",
      location: profile.location || "",
    } : undefined,
  });

  // Fetch location suggestions as user types
  useEffect(() => {
    if (locationSearch.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5`
        );
        const data = await response.json();
        setLocationSuggestions(data);
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationSearch]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return await apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
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

  const updateTimezoneMutation = useMutation({
    mutationFn: async (tz: string) => {
      return await apiRequest("PATCH", "/api/user/settings", { timezone: tz });
    },
    onSuccess: (_, tz) => {
      setTimezone(tz);
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: "Timezone updated",
        description: "Your timezone preference has been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update timezone. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
    updateTimezoneMutation.mutate(value);
  };

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal information, health profile, and subscription
        </p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="personal" data-testid="tab-personal">
            <User className="h-4 w-4 mr-2" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health">
            <Heart className="h-4 w-4 mr-2" />
            Health
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="preferences" data-testid="tab-preferences">
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-firstname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-lastname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input value={profile?.email || ""} disabled data-testid="input-email" />
                    </FormControl>
                    <FormDescription>
                      Your email is managed through your authentication provider
                    </FormDescription>
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Location</FormLabel>
                        <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="justify-between font-normal"
                                data-testid="button-location"
                              >
                                {field.value || "Search for a city or location..."}
                                <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Type to search locations..."
                                value={locationSearch}
                                onValueChange={setLocationSearch}
                                data-testid="input-location-search"
                              />
                              <CommandList>
                                {locationSearch.length < 3 && (
                                  <CommandEmpty>Type at least 3 characters to search...</CommandEmpty>
                                )}
                                {locationSearch.length >= 3 && locationSuggestions.length === 0 && (
                                  <CommandEmpty>No locations found.</CommandEmpty>
                                )}
                                {locationSuggestions.length > 0 && (
                                  <CommandGroup>
                                    {locationSuggestions.map((suggestion, index) => (
                                      <CommandItem
                                        key={index}
                                        value={suggestion.display_name}
                                        onSelect={() => {
                                          field.onChange(suggestion.display_name);
                                          setLocationOpen(false);
                                          setLocationSearch("");
                                        }}
                                        data-testid={`option-location-${index}`}
                                      >
                                        <MapPin className="mr-2 h-4 w-4" />
                                        {suggestion.display_name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Search and select your city or location
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-dob" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-personal"
                  >
                    {updateProfileMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Profile</CardTitle>
              <CardDescription>
                Manage your health information for better insights and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height (cm)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              value={field.value || ""}
                              type="number" 
                              step="0.1" 
                              placeholder="175"
                              data-testid="input-height"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {profile?.latestWeight && (
                      <FormItem>
                        <FormLabel>Current Weight</FormLabel>
                        <FormControl>
                          <Input 
                            value={`${convertValue(
                              profile.latestWeight.value,
                              "weight",
                              profile.latestWeight.unit,
                              unitConfigs.weight[unitSystem].unit
                            ).toFixed(1)} ${unitConfigs.weight[unitSystem].unit}`} 
                            disabled
                            data-testid="input-weight"
                          />
                        </FormControl>
                        <FormDescription>
                          Synced from your latest biomarker entry
                        </FormDescription>
                      </FormItem>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="bloodType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blood Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-bloodtype">
                                <SelectValue placeholder="Select blood type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="activityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activity Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-activity">
                                <SelectValue placeholder="Select activity level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sedentary">Sedentary</SelectItem>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="very_active">Very Active</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-health"
                  >
                    {updateProfileMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Fitness Profile
              </CardTitle>
              <CardDescription>
                Configure your training preferences and AI workout recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Set up your fitness level, available equipment, workout goals, and training preferences to receive personalized AI-powered workout plans tailored to your specific needs.
              </p>
              <Link href="/training/fitness-profile">
                <Button variant="default" className="w-full sm:w-auto" data-testid="button-fitness-profile">
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Manage Fitness Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>
                Manage your subscription plan and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Current Plan</h3>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
                  <div className="flex items-center gap-3">
                    {profile?.subscriptionTier === "premium" || profile?.subscriptionTier === "enterprise" ? (
                      <Crown className="h-6 w-6 text-primary" />
                    ) : (
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium capitalize text-lg">
                          {profile?.subscriptionTier === "premium" ? "Premium" : 
                           profile?.subscriptionTier === "enterprise" ? "Enterprise" : "Free"}
                        </p>
                        {(profile?.subscriptionTier === "premium" || profile?.subscriptionTier === "enterprise") && (
                          <Badge variant="default" className="bg-primary">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile?.subscriptionTier === "premium" 
                          ? "Unlimited AI messages, meal plans, and more"
                          : profile?.subscriptionTier === "enterprise"
                          ? "Enterprise features with team management"
                          : "Basic features with limited AI messages"}
                      </p>
                    </div>
                  </div>
                  {profile?.subscriptionTier === "free" && (
                    <Button onClick={() => setShowCheckout(true)} data-testid="button-upgrade">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Upgrade Now
                    </Button>
                  )}
                </div>
              </div>

              {profile?.subscriptionTier === "free" && (
                <div className="rounded-lg border-2 border-primary/20 p-6 bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Crown className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Unlock Premium Features</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get unlimited AI messages, personalized meal plans, voice chat, and advanced analytics
                      </p>
                      <ul className="space-y-2 mb-4">
                        <li className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Unlimited AI chat messages
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          AI-generated meal plans & recipes
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Voice chat with AI coach
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Advanced health analytics
                        </li>
                      </ul>
                      <Button onClick={() => setShowCheckout(true)} size="lg" data-testid="button-upgrade-premium">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Start 7-Day Free Trial
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {(profile?.subscriptionTier === "premium" || profile?.subscriptionTier === "enterprise") && (
                <div>
                  <h3 className="font-semibold mb-2">Manage Subscription</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    View billing history, update payment method, or cancel your subscription
                  </p>
                  <Button variant="outline" data-testid="button-manage-subscription">
                    Manage in Stripe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <CheckoutModal
            isOpen={showCheckout}
            onClose={() => setShowCheckout(false)}
          />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>
                Configure how dates and times are displayed across the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={selectedTimezone}
                  onValueChange={handleTimezoneChange}
                  disabled={updateTimezoneMutation.isPending}
                >
                  <SelectTrigger id="timezone" data-testid="select-timezone">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  All timestamps in the application will be displayed in your selected timezone
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
