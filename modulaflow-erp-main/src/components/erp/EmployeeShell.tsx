import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  TrendingUp,
  Clock,
  CalendarDays,
  UserRound,
  Bell,
  CircleHelp,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { HeaderActions } from "@/components/erp/HeaderActions";

const EMPLOYEE_NAV = [
  { label: "My Dashboard", icon: LayoutDashboard, to: "/employee-dashboard" },
  { label: "My Tasks", icon: CheckSquare, to: "/employee-tasks" },
  { label: "My Projects", icon: FolderKanban, to: "/employee-projects" },
  { label: "Daily Progress", icon: TrendingUp, to: "/employee-progress" },
  { label: "My Attendance", icon: Clock, to: "/employee-attendance" },
  { label: "My Leaves", icon: CalendarDays, to: "/employee-leaves" },
  { label: "My Profile", icon: UserRound, to: "/employee-profile" },
  { label: "Notifications", icon: Bell, to: "/employee-notifications" },
  { label: "Help & Support", icon: CircleHelp, to: "/employee-help" },
];

function EmployeeSidebar({ open }: { open: boolean }) {
  const { pathname } = useLocation();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-24 items-center justify-center border-b border-sidebar-border px-5">
        <img
          src="/logo.png"
          alt="Payal Decor Logo"
          className="h-16 w-full object-contain"
          onError={() => console.error("Payal Decor logo failed to load")}
        />
      </div>

      <div className="border-b border-sidebar-border px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
          Employee Workspace
        </p>
        <p className="mt-1 text-sm font-semibold text-sidebar-foreground">
          My Work Portal
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-3 text-[10px] font-semibold tracking-[0.16em] text-sidebar-foreground/45">
          MY WORKSPACE
        </p>

        <ul className="space-y-1">
          {EMPLOYEE_NAV.map((item) => {
            const active =
              pathname === item.to || pathname.startsWith(`${item.to}/`);

            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
                    active
                      ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent",
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs font-semibold tracking-wide text-sidebar-foreground/80">
          PAYAL DECOR ERP
        </p>
        <p className="mt-1 text-xs text-sidebar-foreground/50">
          Employee Portal · v1.0.0
        </p>
      </div>
    </aside>
  );
}

export function EmployeeShell({
  title = "My Dashboard",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <EmployeeSidebar open={open} />

      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
          <button
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>

          <h1 className="text-base font-semibold">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            <HeaderActions />
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
