import { useMemo } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import i18n from "./i18n";
import { getCurrentUser, isLoggedIn } from "./lib/auth";

import Dashboard from "./routes/index";
import LoginPage from "./routes/login";
import Accounts from "./routes/accounts";
import AdminLayout from "./routes/admin";
import AdminDashboard from "./routes/admin.index";
import AdminBackup from "./routes/admin.backup";
import AdminModuleSettings from "./routes/admin.module-settings";
import AdminRolesPermissions from "./routes/admin.roles-permissions";
import AdminSystemSettings from "./routes/admin.system-settings";
import AdminUsers from "./routes/admin.users";
import BOMPage from "./routes/bom-material-requirement";
import CRMPage from "./routes/crm";
import DispatchPage from "./routes/dispatch";
import EstimatePreviewPage from "./routes/estimate-preview";
import Estimation from "./routes/estimation";
import InstallationPage from "./routes/installation";
import Inventory from "./routes/inventory";
import InvoicePreviewPage from "./routes/invoice-preview";
import Invoicing from "./routes/invoicing";
import LeadEnquiryPage from "./routes/lead-enquiry";
import Masters from "./routes/masters";
import MastersProducts from "./routes/masters.products";
import OperationsPage from "./routes/operations";
import Payments from "./routes/payments";
import ProductionPage from "./routes/production";
import ProjectsPage from "./routes/projects";
import Purchase from "./routes/purchase";
import QuotationsPage from "./routes/quotations";
import Reports from "./routes/reports";
import SalesOrdersPage from "./routes/sales-orders";
import SiteVisitMeasurementPage from "./routes/site-visit-measurement";
import VendorsPage from "./routes/vendors";
import WorkOrdersPage from "./routes/work-orders";
import EmployeeDashboardPage from "./routes/employee-dashboard";
import EmployeeTasksPage from "./routes/employee-tasks";

function RequireAuth() {
  const location = useLocation();
  return isLoggedIn() ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

function RequireEmployee() {
  return getCurrentUser()?.role === "Employee" ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace />
  );
}

function RequireNonEmployee() {
  return getCurrentUser()?.role === "Employee" ? (
    <Navigate to="/employee-dashboard" replace />
  ) : (
    <Outlet />
  );
}

function LoginRoute() {
  if (!isLoggedIn()) {
    return <LoginPage />;
  }

  const user = getCurrentUser();

  if (user?.role === "Employee") {
    return <Navigate to="/employee-dashboard" replace />;
  }

  return <Navigate to="/" replace />;
}

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go home
        </a>
      </div>
    </main>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireEmployee />}>
          <Route path="/employee-dashboard" element={<EmployeeDashboardPage />} />

  <Route path="/employee-tasks" element={<EmployeeTasksPage />} />
        </Route>
        <Route element={<RequireNonEmployee />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/dispatch" element={<DispatchPage />} />
        <Route path="/bom-material-requirement" element={<BOMPage />} />
        <Route path="/estimate-preview" element={<EstimatePreviewPage />} />
        <Route path="/estimation" element={<Estimation />} />
        <Route path="/installation" element={<InstallationPage />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/invoice-preview" element={<InvoicePreviewPage />} />
        <Route path="/invoicing" element={<Invoicing />} />
        <Route path="/lead-enquiry" element={<LeadEnquiryPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/production" element={<ProductionPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/purchase" element={<Purchase />} />
        <Route path="/quotations" element={<QuotationsPage />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/sales-orders" element={<SalesOrdersPage />} />
        <Route path="/site-visit-measurement" element={<SiteVisitMeasurementPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/work-orders" element={<WorkOrdersPage />} />

        <Route path="/masters" element={<Masters />} />
        <Route path="/masters/products" element={<MastersProducts />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="backup" element={<AdminBackup />} />
          <Route path="module-settings" element={<AdminModuleSettings />} />
          <Route path="roles-permissions" element={<AdminRolesPermissions />} />
          <Route path="system-settings" element={<AdminSystemSettings />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
        },
      }),
    [],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton duration={3500} />
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

