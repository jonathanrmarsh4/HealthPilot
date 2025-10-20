import { useState } from "react";
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
import { Loader2, Plus, Trash2, Eye, EyeOff, GripVertical, Save } from "lucide-react";
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="hero" data-testid="tab-hero">Hero</TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">Features</TabsTrigger>
          <TabsTrigger value="testimonials" data-testid="tab-testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing</TabsTrigger>
          <TabsTrigger value="social" data-testid="tab-social">Social</TabsTrigger>
          <TabsTrigger value="seo" data-testid="tab-seo">SEO</TabsTrigger>
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

function TestimonialsSection({ testimonials, content, onSaveContent }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Testimonials</CardTitle>
        <CardDescription>Coming soon - manage customer testimonials</CardDescription>
      </CardHeader>
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

function SocialSection({ socialLinks }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Links</CardTitle>
        <CardDescription>Coming soon - manage social media links</CardDescription>
      </CardHeader>
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
            <h3 className="font-semibold">Twitter Card</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Twitter Title</Label>
                <Input
                  value={formData.twitterTitle}
                  onChange={(e) => setFormData({ ...formData, twitterTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Twitter Image URL</Label>
                <Input
                  value={formData.twitterImage}
                  onChange={(e) => setFormData({ ...formData, twitterImage: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Twitter Description</Label>
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
