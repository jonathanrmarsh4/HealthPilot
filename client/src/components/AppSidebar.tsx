import {
  Activity,
  FileText,
  LayoutDashboard,
  Utensils,
  Dumbbell,
  Sparkles,
  Smartphone,
  Moon,
  Shield,
  User,
  BarChart3,
  Target,
  Dna,
  Pill,
  ChevronRight,
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  Sliders,
  UserCircle,
  Wallet,
  Settings,
  Mic,
  MessageSquare,
  Lock,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import logoPath from "@assets/HealthPilot_Logo_1759904141260.png";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  badge?: string;
}

interface MenuSection {
  title: string;
  icon: any;
  items: MenuItem[];
  adminOnly?: boolean;
}

const menuSections: MenuSection[] = [
  {
    title: "About You",
    icon: UserCircle,
    items: [
      { title: "Goals", url: "/goals", icon: Target },
      { title: "Biomarkers", url: "/biomarkers", icon: Activity },
      { title: "Sleep", url: "/sleep", icon: Moon },
      { title: "Longevity", url: "/biological-age", icon: Dna },
    ],
  },
  {
    title: "Your Plan",
    icon: Dumbbell,
    items: [
      { title: "Training", url: "/training", icon: Dumbbell },
      { title: "Nutrition", url: "/meals", icon: Utensils },
      { title: "Supplementation", url: "/supplements", icon: Pill },
    ],
  },
  {
    title: "AI Coach",
    icon: Sparkles,
    items: [
      { title: "Chat", url: "/chat", icon: MessageSquare },
      { title: "Voice Chat", url: "/voice-chat", icon: Mic },
      { title: "Recommendations", url: "/insights", icon: Sparkles },
      { title: "Trends", url: "/data-insights", icon: BarChart3 },
    ],
  },
  {
    title: "Settings & Data",
    icon: Settings,
    items: [
      { title: "Health Records", url: "/records", icon: FileText },
      { title: "Fitness Profile", url: "/training/fitness-profile", icon: User },
      { title: "Nutrition Profile", url: "/meals/nutrition-profile", icon: Utensils },
      { title: "Integrations", url: "/apple-health", icon: Smartphone },
      { title: "Privacy Policy", url: "/privacy", icon: Lock },
      { title: "Privacy Dashboard", url: "/privacy-dashboard", icon: ShieldCheck },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isAdmin } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <img 
            src={logoPath} 
            alt="HealthPilot" 
            className="h-10 w-10 object-contain"
          />
          <span className="text-lg font-semibold">HealthPilot</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* Dashboard - Always visible at top */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/"}
                  data-testid="link-dashboard"
                >
                  <Link href="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/admin")}
                    data-testid="link-admin-panel"
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Collapsible Menu Sections */}
        {menuSections.map((section) => {
          // Hide admin section if not admin
          if (section.adminOnly && !isAdmin) return null;

          return (
            <Collapsible key={section.title} defaultOpen={false} className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1.5">
                    <section.icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{section.title}</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild={!item.badge}
                            isActive={location === item.url}
                            disabled={!!item.badge}
                            data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {item.badge ? (
                              <span className="pl-6 cursor-not-allowed" aria-disabled="true">
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {item.badge}
                                </span>
                              </span>
                            ) : (
                              <Link href={item.url} className="pl-6">
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}

        {/* Profile at bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/profile"} data-testid="link-profile">
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
