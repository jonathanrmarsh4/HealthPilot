import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Eye, EyeOff, GripVertical, Save, Pencil } from "lucide-react";
import {
  type LandingPageContent,
  type LandingPageFeature,
  type LandingPageTestimonial,
  type LandingPagePricingPlan,
  type LandingPageSocialLink,
} from "@shared/schema";

export default function AdminLandingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("hero");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/landing-page"],
  });

  const updateContentMutation = useMutation({
    mutationFn: async (content: Partial<LandingPageContent>) => {
      return apiRequest("/api/admin/landing-page/content", {
        method: "PUT",
        body: JSON.stringify(content),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Content updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating content", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const content = data?.content;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Landing Page CMS</h1>
        <p className="text-muted-foreground mt-2">
          Manage your landing page content, SEO, and visibility settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="hero" data-testid="tab-hero">Hero</TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">Features</TabsTrigger>
          <TabsTrigger value="testimonials" data-testid="tab-testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing</TabsTrigger>
          <TabsTrigger value="social" data-testid="tab-social">Social</TabsTrigger>
          <TabsTrigger value="seo" data-testid="tab-seo">SEO</TabsTrigger>
          <TabsTrigger value="theme" data-testid="tab-theme">Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-6">
          <HeroSection content={content} onSave={updateContentMutation.mutate} />
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <FeaturesSection 
            features={data?.features || []}
            content={content}
            onSaveContent={updateContentMutation.mutate}
          />
        </TabsContent>

        <TabsContent value="testimonials" className="mt-6">
          <TestimonialsSection 
            testimonials={data?.testimonials || []}
            content={content}
            onSaveContent={updateContentMutation.mutate}
          />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <PricingSection 
            pricingPlans={data?.pricingPlans || []}
            content={content}
            onSaveContent={updateContentMutation.mutate}
          />
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <SocialSection socialLinks={data?.socialLinks || []} />
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <SEOSection content={content} onSave={updateContentMutation.mutate} />
        </TabsContent>

        <TabsContent value="theme" className="mt-6">
          <ThemeSection content={content} onSave={updateContentMutation.mutate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeroSection({ 
  content, 
  onSave 
}: { 
  content: LandingPageContent | undefined; 
  onSave: (data: Partial<LandingPageContent>) => void;
}) {
  const [formData, setFormData] = useState({
    heroTitle: content?.heroTitle || "",
    heroSubtitle: content?.heroSubtitle || "",
    heroDescription: content?.heroDescription || "",
    heroBadgeText: content?.heroBadgeText || "",
    heroCtaPrimary: content?.heroCtaPrimary || "",
    heroCtaPrimaryLink: content?.heroCtaPrimaryLink || "",
    heroCtaSecondary: content?.heroCtaSecondary || "",
    heroCtaSecondaryLink: content?.heroCtaSecondaryLink || "",
    heroVisible: content?.heroVisible ?? 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section</CardTitle>
        <CardDescription>Main heading and call-to-action area</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="hero-visible">Visible</Label>
            <Switch
              id="hero-visible"
              checked={formData.heroVisible === 1}
              onCheckedChange={(checked) => setFormData({ ...formData, heroVisible: checked ? 1 : 0 })}
              data-testid="switch-hero-visible"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-title">Title</Label>
            <Input
              id="hero-title"
              value={formData.heroTitle}
              onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
              placeholder="HealthPilot"
              data-testid="input-hero-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Subtitle</Label>
            <Input
              id="hero-subtitle"
              value={formData.heroSubtitle}
              onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
              placeholder="Your Body, Decoded"
              data-testid="input-hero-subtitle"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-description">Description</Label>
            <Textarea
              id="hero-description"
              value={formData.heroDescription}
              onChange={(e) => setFormData({ ...formData, heroDescription: e.target.value })}
              rows={3}
              data-testid="textarea-hero-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-badge">Badge Text</Label>
            <Input
              id="hero-badge"
              value={formData.heroBadgeText || ""}
              onChange={(e) => setFormData({ ...formData, heroBadgeText: e.target.value })}
              placeholder="AI-Powered Health Intelligence"
              data-testid="input-hero-badge"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta-primary">Primary CTA Text</Label>
              <Input
                id="cta-primary"
                value={formData.heroCtaPrimary || ""}
                onChange={(e) => setFormData({ ...formData, heroCtaPrimary: e.target.value })}
                placeholder="Start Free"
                data-testid="input-cta-primary-text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-primary-link">Primary CTA Link</Label>
              <Input
                id="cta-primary-link"
                value={formData.heroCtaPrimaryLink || ""}
                onChange={(e) => setFormData({ ...formData, heroCtaPrimaryLink: e.target.value })}
                placeholder="/api/login"
                data-testid="input-cta-primary-link"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta-secondary">Secondary CTA Text</Label>
              <Input
                id="cta-secondary"
                value={formData.heroCtaSecondary || ""}
                onChange={(e) => setFormData({ ...formData, heroCtaSecondary: e.target.value })}
                placeholder="Watch Demo"
                data-testid="input-cta-secondary-text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-secondary-link">Secondary CTA Link</Label>
              <Input
                id="cta-secondary-link"
                value={formData.heroCtaSecondaryLink || ""}
                onChange={(e) => setFormData({ ...formData, heroCtaSecondaryLink: e.target.value })}
                placeholder="/security"
                data-testid="input-cta-secondary-link"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" data-testid="button-save-hero">
            <Save className="w-4 h-4 mr-2" />
            Save Hero Section
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FeaturesSection({ 
  features, 
  content,
  onSaveContent
}: { 
  features: LandingPageFeature[];
  content: LandingPageContent | undefined;
  onSaveContent: (data: Partial<LandingPageContent>) => void;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (feature: any) => {
      return apiRequest("/api/admin/landing-page/features", {
        method: "POST",
        body: JSON.stringify(feature),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Feature created successfully" });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/admin/landing-page/features/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Feature updated successfully" });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/landing-page/features/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Feature deleted successfully" });
    },
  });

  const howItWorksFeatures = features.filter(f => f.section === 'how_it_works');
  const regularFeatures = features.filter(f => f.section === 'features');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Section Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>How It Works Section Visible</Label>
            <Switch
              checked={content?.howItWorksVisible === 1}
              onCheckedChange={(checked) => onSaveContent({ howItWorksVisible: checked ? 1 : 0 })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Features Section Visible</Label>
            <Switch
              checked={content?.featuresVisible === 1}
              onCheckedChange={(checked) => onSaveContent({ featuresVisible: checked ? 1 : 0 })}
            />
          </div>
        </CardContent>
      </Card>

      <FeatureList 
        title="How It Works" 
        features={howItWorksFeatures}
        section="how_it_works"
        onDelete={deleteMutation.mutate}
        onToggleVisible={(id, visible) => updateMutation.mutate({ id, data: { visible } })}
        onAdd={() => setShowForm(true)}
      />

      <FeatureList 
        title="Features" 
        features={regularFeatures}
        section="features"
        onDelete={deleteMutation.mutate}
        onToggleVisible={(id, visible) => updateMutation.mutate({ id, data: { visible } })}
        onAdd={() => setShowForm(true)}
      />

      {showForm && (
        <FeatureForm
          section="features"
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function FeatureList({
  title,
  features,
  section,
  onDelete,
  onToggleVisible,
  onAdd,
}: {
  title: string;
  features: LandingPageFeature[];
  section: string;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string, visible: number) => void;
  onAdd: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button onClick={onAdd} size="sm" data-testid={`button-add-${section}`}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {features.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet</p>
          ) : (
            features.map((feature) => (
              <div key={feature.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <GripVertical className="w-5 h-5 text-muted-foreground mt-1" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Icon: {feature.icon}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleVisible(feature.id, feature.visible === 1 ? 0 : 1)}
                    data-testid={`button-toggle-feature-${feature.id}`}
                  >
                    {feature.visible === 1 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(feature.id)}
                    data-testid={`button-delete-feature-${feature.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureForm({
  section,
  onSave,
  onCancel,
}: {
  section: string;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    section,
    icon: "",
    title: "",
    description: "",
    order: 0,
    visible: 1,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Feature</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Icon (Lucide icon name)</Label>
            <Input
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="Activity"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Save</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TestimonialsSection({ 
  testimonials, 
  content, 
  onSaveContent 
}: { 
  testimonials: LandingPageTestimonial[];
  content: LandingPageContent | undefined;
  onSaveContent: (data: Partial<LandingPageContent>) => void;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<LandingPageTestimonial | null>(null);

  const createMutation = useMutation({
    mutationFn: async (testimonial: any) => {
      return apiRequest("/api/admin/landing-page/testimonials", {
        method: "POST",
        body: JSON.stringify(testimonial),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Testimonial created successfully" });
      setShowForm(false);
      setEditingData(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/admin/landing-page/testimonials/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Testimonial updated successfully" });
      setEditingId(null);
      setEditingData(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/landing-page/testimonials/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Testimonial deleted successfully" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Section Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Testimonials Section Visible</Label>
            <Switch
              checked={content?.testimonialsVisible === 1}
              onCheckedChange={(checked) => onSaveContent({ testimonialsVisible: checked ? 1 : 0 })}
              data-testid="switch-testimonials-visible"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Testimonials</CardTitle>
            <Button onClick={() => {
              setEditingId(null);
              setEditingData(null);
              setShowForm(true);
            }} size="sm" data-testid="button-add-testimonial">
              <Plus className="w-4 h-4 mr-2" />
              Add Testimonial
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testimonials.length === 0 ? (
              <p className="text-sm text-muted-foreground">No testimonials yet</p>
            ) : (
              testimonials.map((testimonial) => (
                <div key={testimonial.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <GripVertical className="w-5 h-5 text-muted-foreground mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{testimonial.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role}{testimonial.company && ` at ${testimonial.company}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                          <span key={i} className="text-yellow-500">★</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm italic">"{testimonial.quote}"</p>
                    {testimonial.photoUrl && (
                      <p className="text-xs text-muted-foreground mt-1">Photo: {testimonial.photoUrl}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingData(testimonial);
                        setEditingId(testimonial.id);
                        setShowForm(true);
                      }}
                      data-testid={`button-edit-testimonial-${testimonial.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateMutation.mutate({ 
                        id: testimonial.id, 
                        data: { visible: testimonial.visible === 1 ? 0 : 1 } 
                      })}
                      data-testid={`button-toggle-testimonial-${testimonial.id}`}
                    >
                      {testimonial.visible === 1 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(testimonial.id)}
                      data-testid={`button-delete-testimonial-${testimonial.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <TestimonialForm
          initialData={editingData}
          onSave={(data) => {
            if (editingId) {
              updateMutation.mutate({ id: editingId, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
            setEditingData(null);
          }}
        />
      )}
    </div>
  );
}

function TestimonialForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: LandingPageTestimonial | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    role: initialData?.role || "",
    company: initialData?.company || "",
    photoUrl: initialData?.photoUrl || "",
    quote: initialData?.quote || "",
    rating: initialData?.rating || 5,
    order: initialData?.order || 0,
    visible: initialData?.visible ?? 1,
  });

  useEffect(() => {
    setFormData({
      name: initialData?.name || "",
      role: initialData?.role || "",
      company: initialData?.company || "",
      photoUrl: initialData?.photoUrl || "",
      quote: initialData?.quote || "",
      rating: initialData?.rating || 5,
      order: initialData?.order || 0,
      visible: initialData?.visible ?? 1,
    });
  }, [initialData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Testimonial' : 'Add New Testimonial'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
                data-testid="input-testimonial-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="CEO"
                required
                data-testid="input-testimonial-role"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Acme Inc"
                data-testid="input-testimonial-company"
              />
            </div>
            <div className="space-y-2">
              <Label>Photo URL</Label>
              <Input
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-testimonial-photo"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Quote</Label>
            <Textarea
              value={formData.quote}
              onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
              rows={3}
              placeholder="This product changed my life..."
              required
              data-testid="textarea-testimonial-quote"
            />
          </div>
          <div className="space-y-2">
            <Label>Rating (1-5 stars)</Label>
            <Input
              type="number"
              min="1"
              max="5"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
              data-testid="input-testimonial-rating"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" data-testid="button-save-testimonial">Save</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PricingSection({ pricingPlans, content, onSaveContent }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Plans</CardTitle>
        <CardDescription>Coming soon - manage pricing tiers</CardDescription>
      </CardHeader>
    </Card>
  );
}

function SocialSection({ socialLinks }: { socialLinks: LandingPageSocialLink[] }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<LandingPageSocialLink | null>(null);

  const createMutation = useMutation({
    mutationFn: async (socialLink: any) => {
      return apiRequest("/api/admin/landing-page/social", {
        method: "POST",
        body: JSON.stringify(socialLink),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Social link created successfully" });
      setShowForm(false);
      setEditingData(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/admin/landing-page/social/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Social link updated successfully" });
      setEditingId(null);
      setEditingData(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/landing-page/social/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      toast({ title: "Social link deleted successfully" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>Manage your social media presence</CardDescription>
            </div>
            <Button onClick={() => {
              setEditingId(null);
              setEditingData(null);
              setShowForm(true);
            }} size="sm" data-testid="button-add-social">
              <Plus className="w-4 h-4 mr-2" />
              Add Social Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {socialLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No social links yet</p>
            ) : (
              socialLinks.map((link) => (
                <div key={link.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <GripVertical className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold capitalize">{link.platform}</h4>
                      {link.icon && (
                        <span className="text-xs text-muted-foreground">({link.icon})</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingData(link);
                        setEditingId(link.id);
                        setShowForm(true);
                      }}
                      data-testid={`button-edit-social-${link.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateMutation.mutate({ 
                        id: link.id, 
                        data: { visible: link.visible === 1 ? 0 : 1 } 
                      })}
                      data-testid={`button-toggle-social-${link.id}`}
                    >
                      {link.visible === 1 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(link.id)}
                      data-testid={`button-delete-social-${link.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <SocialLinkForm
          initialData={editingData}
          onSave={(data) => {
            if (editingId) {
              updateMutation.mutate({ id: editingId, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
            setEditingData(null);
          }}
        />
      )}
    </div>
  );
}

function SocialLinkForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: LandingPageSocialLink | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    platform: initialData?.platform || "",
    url: initialData?.url || "",
    icon: initialData?.icon || "",
    order: initialData?.order || 0,
    visible: initialData?.visible ?? 1,
  });

  useEffect(() => {
    setFormData({
      platform: initialData?.platform || "",
      url: initialData?.url || "",
      icon: initialData?.icon || "",
      order: initialData?.order || 0,
      visible: initialData?.visible ?? 1,
    });
  }, [initialData]);

  const platformOptions = [
    { value: "x", label: "X (Twitter)" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "github", label: "GitHub" },
    { value: "youtube", label: "YouTube" },
    { value: "tiktok", label: "TikTok" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Social Media Link' : 'Add Social Media Link'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              required
              data-testid="select-social-platform"
            >
              <option value="">Select platform...</option>
              {platformOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://x.com/yourprofile"
              required
              data-testid="input-social-url"
            />
          </div>
          <div className="space-y-2">
            <Label>Icon (Lucide icon name - optional)</Label>
            <Input
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="Twitter"
              data-testid="input-social-icon"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" data-testid="button-save-social">Save</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SEOSection({ 
  content, 
  onSave 
}: { 
  content: LandingPageContent | undefined; 
  onSave: (data: Partial<LandingPageContent>) => void;
}) {
  const [formData, setFormData] = useState({
    metaTitle: content?.metaTitle || "",
    metaDescription: content?.metaDescription || "",
    metaKeywords: content?.metaKeywords || "",
    ogTitle: content?.ogTitle || "",
    ogDescription: content?.ogDescription || "",
    ogImage: content?.ogImage || "",
    twitterTitle: content?.twitterTitle || "",
    twitterDescription: content?.twitterDescription || "",
    twitterImage: content?.twitterImage || "",
    canonicalUrl: content?.canonicalUrl || "",
    robotsMeta: content?.robotsMeta || "index, follow",
    googleAnalyticsId: content?.googleAnalyticsId || "",
    googleTagManagerId: content?.googleTagManagerId || "",
    metaPixelId: content?.metaPixelId || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO & Analytics</CardTitle>
        <CardDescription>Search engine optimization and tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Meta Tags</h3>
            <div className="space-y-2">
              <Label>Page Title</Label>
              <Input
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                placeholder="HealthPilot - AI-Powered Health Intelligence"
                data-testid="input-meta-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                rows={3}
                placeholder="Connect HealthKit and wearables to get real-time insights..."
                data-testid="textarea-meta-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Keywords</Label>
              <Input
                value={formData.metaKeywords}
                onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                placeholder="health, fitness, AI, biomarkers"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Open Graph (Facebook/LinkedIn)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>OG Title</Label>
                <Input
                  value={formData.ogTitle}
                  onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>OG Image URL</Label>
                <Input
                  value={formData.ogImage}
                  onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>OG Description</Label>
              <Textarea
                value={formData.ogDescription}
                onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">X (Twitter) Card</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>X (Twitter) Title</Label>
                <Input
                  value={formData.twitterTitle}
                  onChange={(e) => setFormData({ ...formData, twitterTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>X (Twitter) Image URL</Label>
                <Input
                  value={formData.twitterImage}
                  onChange={(e) => setFormData({ ...formData, twitterImage: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>X (Twitter) Description</Label>
              <Textarea
                value={formData.twitterDescription}
                onChange={(e) => setFormData({ ...formData, twitterDescription: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Advanced SEO</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Canonical URL</Label>
                <Input
                  value={formData.canonicalUrl}
                  onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                  placeholder="https://healthpilot.app"
                />
              </div>
              <div className="space-y-2">
                <Label>Robots Meta</Label>
                <Input
                  value={formData.robotsMeta}
                  onChange={(e) => setFormData({ ...formData, robotsMeta: e.target.value })}
                  placeholder="index, follow"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Analytics & Tracking</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Google Analytics ID</Label>
                <Input
                  value={formData.googleAnalyticsId}
                  onChange={(e) => setFormData({ ...formData, googleAnalyticsId: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Google Tag Manager ID</Label>
                <Input
                  value={formData.googleTagManagerId}
                  onChange={(e) => setFormData({ ...formData, googleTagManagerId: e.target.value })}
                  placeholder="GTM-XXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Meta Pixel ID</Label>
                <Input
                  value={formData.metaPixelId}
                  onChange={(e) => setFormData({ ...formData, metaPixelId: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" data-testid="button-save-seo">
            <Save className="w-4 h-4 mr-2" />
            Save SEO Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ThemeSection({
  content,
  onSave
}: {
  content: LandingPageContent | undefined;
  onSave: (data: Partial<LandingPageContent>) => void;
}) {
  const { toast } = useToast();
  
  const { data: themeData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/theme/premium-enabled"]
  });

  const handleToggle = async (checked: boolean) => {
    try {
      await apiRequest("PUT", "/api/admin/theme/premium-enabled", { enabled: checked });
      
      queryClient.invalidateQueries({ queryKey: ["/api/theme/premium-enabled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-page"] });
      
      toast({
        title: checked ? "Premium theme enabled" : "Premium theme disabled",
        description: checked 
          ? "The coral-to-turquoise gradient theme is now active across the app"
          : "The standard theme is now active"
      });
    } catch (error: any) {
      toast({
        title: "Error updating theme",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const premiumThemeEnabled = themeData?.enabled ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Settings</CardTitle>
        <CardDescription>
          Control the visual theme across the entire application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="premium-theme-toggle" className="text-base font-medium">
              Premium Theme
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable the beautiful coral-to-turquoise gradient theme with glassmorphism effects,
              glowing elements, and premium visual treatments
            </p>
          </div>
          <Switch
            id="premium-theme-toggle"
            data-testid="switch-premium-theme"
            checked={premiumThemeEnabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {premiumThemeEnabled && (
          <div className="p-4 border rounded-lg bg-gradient-to-r from-[#FF7C77] via-[#E58AC9] to-[#00CFCF] text-white">
            <h4 className="font-semibold mb-2">Premium Theme Preview</h4>
            <p className="text-sm opacity-90">
              This is what the premium gradient looks like. The theme features glassmorphism cards,
              gradient buttons, glowing data points in charts, and pill-shaped tabs with gradient indicators.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
