import {
  Activity,
  FileText,
  LayoutDashboard,
  Utensils,
  Dumbbell,
  Sparkles,
  Settings,
  Smartphone,
  MessageCircle,
  Moon,
  Shield,
  User,
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
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import logoPath from "@assets/HealthPilot_1759903615894.png";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Health Records",
    url: "/records",
    icon: FileText,
  },
  {
    title: "Biomarkers",
    url: "/biomarkers",
    icon: Activity,
  },
  {
    title: "Sleep",
    url: "/sleep",
    icon: Moon,
  },
  {
    title: "Apple Health Setup",
    url: "/apple-health",
    icon: Smartphone,
  },
  {
    title: "Meal Plans",
    url: "/meals",
    icon: Utensils,
  },
  {
    title: "Training",
    url: "/training",
    icon: Dumbbell,
  },
  {
    title: "AI Insights",
    url: "/insights",
    icon: Sparkles,
  },
  {
    title: "Health Coach",
    url: "/chat",
    icon: MessageCircle,
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
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/admin"} data-testid="link-admin">
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/profile"} data-testid="link-profile">
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-testid="link-settings">
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
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
