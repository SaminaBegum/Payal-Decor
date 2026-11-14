import { Outlet } from "react-router-dom";
import { AppShell } from "@/components/erp/AppShell";

function AdminLayout() {
  return (
    <AppShell title="Admin">
      <Outlet />
    </AppShell>
  );
}

export default AdminLayout;
