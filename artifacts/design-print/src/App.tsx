import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Layout } from "@/components/layout";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Quotations from "@/pages/quotations";
import SalesOrders from "@/pages/sales-orders";
import JobOrders from "@/pages/job-orders";
import JobOrderDetail from "@/pages/job-order-detail";
import Kanban from "@/pages/kanban";
import Machines from "@/pages/machines";
import Inventory from "@/pages/inventory";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { token, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !token) {
      setLocation("/login");
    }
  }, [token, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }
  if (!token) return null;

  return (
    <Route {...rest}>
      {(params: any) => (
        <Layout>
          <Component params={params} />
        </Layout>
      )}
    </Route>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/kanban" component={Kanban} />
      <ProtectedRoute path="/customers" component={Customers} />
      <ProtectedRoute path="/quotations" component={Quotations} />
      <ProtectedRoute path="/sales-orders" component={SalesOrders} />
      <ProtectedRoute path="/job-orders" component={JobOrders} />
      <ProtectedRoute path="/job-orders/:id" component={JobOrderDetail} />
      <ProtectedRoute path="/machines" component={Machines} />
      <ProtectedRoute path="/inventory" component={Inventory} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/users" component={Users} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
