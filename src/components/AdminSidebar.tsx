import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  Star,
  CreditCard,
  DollarSign,
  LogOut,
  Leaf,
} from "lucide-react";
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Products", url: "/dashboard/products", icon: Package },
  { title: "Reviews", url: "/dashboard/reviews", icon: Star },
  { title: "Transactions", url: "/dashboard/transactions", icon: CreditCard },
  { title: "Payouts", url: "/dashboard/payouts", icon: DollarSign },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          {open && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground">Jamaica Fresh</span>
              <span className="text-xs text-sidebar-foreground/70">Admin Panel</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {open && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
