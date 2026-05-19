import { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ShoppingCart, 
  Briefcase, 
  Trello, 
  Settings, 
  LogOut,
  Package,
  BarChart,
  Boxes
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Kanban", href: "/kanban", icon: Trello },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Quotations", href: "/quotations", icon: FileText },
    { name: "Sales Orders", href: "/sales-orders", icon: ShoppingCart },
    { name: "Job Orders", href: "/job-orders", icon: Briefcase },
    { name: "Machines", href: "/machines", icon: Settings },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Reports", href: "/reports", icon: BarChart },
  ];

  if (user?.role === "admin") {
    navigation.push({ name: "Users", href: "/users", icon: Boxes });
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <span className="text-xl font-bold text-primary tracking-tight">DPPT System</span>
        </div>
        
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-3">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold truncate">{user?.name}</span>
              <span className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">{user?.role.replace('_', ' ')}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-sidebar-foreground/70 hover:text-white hover:bg-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-border flex items-center px-6 md:hidden">
           <span className="text-lg font-bold text-primary">DPPT</span>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
