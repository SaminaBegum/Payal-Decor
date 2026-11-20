import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Calendar,
  Download,
  Upload,
  CheckSquare,
  Users2,
  UserPlus,
  User,
  ShieldCheck,
  Lock,
  Target,
  AlertCircle,
  PauseCircle,
  FileSpreadsheet,
  Briefcase,
  Check,
  LogIn,
  LogOut,
  KeyRound,
  UserCheck,
  Users,

Building2,
} from "lucide-react";
import { AppShell } from "@/components/erp/AppShell";
import {
  loginAdmin,
  loginEmployee,
  getCurrentUser,
  getAuthToken,
  logout,
} from "@/lib/auth";

const API_BASE = (
  import.meta.env["VITE_API_URL"] || "http://localhost:5000/api"
).replace(/\/+$/, "");

export type PriorityLevel = "Critical" | "Urgent" | "High" | "Medium" | "Low";
export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "On Hold"
  | "Blocked"
  | "Pending"
  | "Under Review";


export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  phone?: string;
  avatarColor?: string;
  status: "Active" | "Inactive";
}


export interface AuthSession {
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  mustChangePassword?: boolean;
}

export interface OperationTask {
  id: string;
  taskId: string; // Format: PD-001, PD-002, PD-003, etc.
  workstream: string;
  taskActivity: string;
  priority: PriorityLevel;
  employee: string; // "Disha" | "Sairaj" | "Saniya"
  primaryResponsible: string;
  supportingRole: string;
  expectedDeliverable: string;
  targetDate: string; // YYYY-MM-DD
  status: TaskStatus;
  remarks: string;
  others: string;
  createdAt?: string;
  updatedAt?: string;
}

export const WORKSTREAM_OPTIONS = [
  "Software / Operation",
  "Software & Operations",
  "Data & Documentation",
  "Business Development",
  "Company Profile",
  "Resource Allocation",
  "Business Automation",
  "Marketing",
  "Website",
  "Reporting & Governance",
  "Invoice & Billing Module",
  "User Accounts & Access",
  "Software Rollout & Adoption",
  "Operations & Project Control",
  "Quality Assurance & Sign-off",
  "Production",
  "Procurement",
  "Design & CAD",
  "Site & Installation",
  "Quality & QA",
  "Logistics",
  "Accounts & Admin",
  "Sales & CRM",
  "Maintenance",
];

export const STATUS_OPTIONS: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
  "Blocked",
  "Pending",
  "Under Review",
];

export const PRIORITY_OPTIONS: PriorityLevel[] = [
  "Critical",
  "Urgent",
  "High",
  "Medium",
  "Low",
];

const LOCAL_STORAGE_KEY = "payal_decor_operations_tasks_v10";



// Configured employees: Disha, Gaurav (Project Manager), Sairaj, and Saniya


// Exact dataset transcribed from Payal Decor Daily Task & Execution Tracker (PD-001 to PD-050)
// Configured strictly across Disha, Gaurav, Sairaj, and Saniya
export const PDF_TASKS_DATA: OperationTask[] = [
  {
    id: "pd-001",
    taskId: "PD-001",
    workstream: "Software & Operations",
    taskActivity: "Create the Operations tab in the existing software",
    priority: "Critical",
    employee: "Disha",
    primaryResponsible: "Software Developer",
    supportingRole: "Project Manager",
    expectedDeliverable: "Operations tab structure, fields and workflow agreed and implemented",
    targetDate: "2026-11-06",
    status: "Completed",
    remarks: "milestone",
    others: "",
  },
  {
    id: "pd-002",
    taskId: "PD-002",
    workstream: "Software & Operations",
    taskActivity: "Map end-to-end business workflow and module requirements",
    priority: "Critical",
    employee: "Gaurav",
    primaryResponsible: "Project Manager",
    supportingRole: "Software Developer",
    expectedDeliverable: "Approved workflow covering enquiry through project closure",
    targetDate: "2026-11-06",
    status: "In Progress",
    remarks: "requirements may change later - blocker.",
    others: "",
  },
  {
    id: "pd-003",
    taskId: "PD-003",
    workstream: "Software & Operations",
    taskActivity: "Define lead, client, quotation, invoice and payment workflows",
    priority: "High",
    employee: "Disha",
    primaryResponsible: "Software Developer",
    supportingRole: "Project Manager",
    expectedDeliverable: "Module-wise requirements and process flow documented",
    targetDate: "2026-11-09",
    status: "Not Started",
    remarks: "",
    others: "",
  },
  
 
  
 
 
];

export function getNextTaskId(tasks: OperationTask[]): string {
  let maxNumber = 0;
  for (const t of tasks) {
    if (t.taskId && t.taskId.startsWith("PD-")) {
      const numPart = parseInt(t.taskId.replace(/^PD-/, ""), 10);
      if (!isNaN(numPart) && numPart > maxNumber) {
        maxNumber = numPart;
      }
    }
  }
  return `PD-${String(maxNumber + 1).padStart(3, "0")}`;
}

const emptyFormData = (autoId: string = "PD-001", defaultEmployee: string = "Disha") => ({
  taskId: autoId,
  workstream: "Software & Operations",
  taskActivity: "",
  priority: "High" as PriorityLevel,
  employee: defaultEmployee,
  primaryResponsible: "",
  supportingRole: "",
  expectedDeliverable: "",
  targetDate: new Date().toISOString().slice(0, 10),
  status: "Not Started" as TaskStatus,
  remarks: "",
  others: "",
});

function formatDateDisplay(val: string) {
  if (!val) return "â€”";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getWorkstreamBadgeColor(ws: string) {
  switch (ws) {
    case "Software & Operations":
    case "Software / Operation":
      return "bg-violet-100 text-violet-800 border-violet-200";
    case "Data & Documentation":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "Business Development":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Company Profile":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "Resource Allocation":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "Business Automation":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Marketing":
      return "bg-pink-100 text-pink-800 border-pink-200";
    case "Website":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Reporting & Governance":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "Invoice & Billing Module":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "User Accounts & Access":
      return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
    case "Software Rollout & Adoption":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "Operations & Project Control":
      return "bg-lime-100 text-lime-800 border-lime-200";
    case "Quality Assurance & Sign-off":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "Production":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Procurement":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Design & CAD":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "Site & Installation":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "Quality & QA":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Logistics":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Accounts & Admin":
      return "bg-slate-100 text-slate-800 border-slate-200";
    case "Sales & CRM":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getPriorityBadge(priority: PriorityLevel) {
  switch (priority) {
    case "Critical":
    case "Urgent":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          {priority}
        </span>
      );
    case "High":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          High
        </span>
      );
    case "Medium":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Medium
        </span>
      );
    case "Low":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          Low
        </span>
      );
  }
}

function getStatusBadge(status: TaskStatus) {
  switch (status) {
    case "Completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          Completed
        </span>
      );
    case "In Progress":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          In Progress
        </span>
      );
    case "On Hold":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
          On Hold
        </span>
      );
    case "Blocked":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          Blocked
        </span>
      );
    case "Under Review":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
          <Target className="h-3.5 w-3.5 text-purple-600" />
          Under Review
        </span>
      );
    case "Not Started":
    case "Pending":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          {status}
        </span>
      );
  }
}

function OperationsPage() {
  const [tasks, setTasks] = useState<OperationTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [workstreamFilter, setWorkstreamFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // ============================================================
  // SECURE AUTHENTICATION VIA EMAIL AND NAME (AS REQUESTED)
  // An employee must log in via Email and Name.
  // Once logged in (e.g. as Disha), only Disha's tasks are visible!
  // Anyone without logging in as another employee cannot see their tasks!
  // ============================================================
 

const [currentSession, setCurrentSession] = useState<AuthSession>(() => {
  const authUser = getCurrentUser();

  if (!authUser) {
    return {
      name: "",
      email: "",
      role: "",
      isAdmin: false,
      mustChangePassword: false,
    };
  }

  return {
    name: authUser.name,
    email: authUser.email,
    role: authUser.role,
    isAdmin: authUser.isAdmin,
    mustChangePassword: authUser.mustChangePassword,
  };
});



  // Login Modal State (Supports Admin & Individual Employee with own passwords)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalLoginRole, setModalLoginRole] = useState<"admin" | "employee">("employee");
  const [modalAdminId, setModalAdminId] = useState("admin");
  const [modalEmployeeId, setModalEmployeeId] = useState("");
  const [modalPassword, setModalPassword] = useState("");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
const [showPasswordChange, setShowPasswordChange] = useState(() => {
  const authUser = getCurrentUser();
  return Boolean(authUser && !authUser.isAdmin && authUser.mustChangePassword);
});
const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmNewPassword, setConfirmNewPassword] = useState("");
const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTask, setViewingTask] = useState<OperationTask | null>(null);
  const [form, setForm] = useState(emptyFormData("PD-001", currentSession.name));
  const [saving, setSaving] = useState(false);

  // Import Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importParsedCount, setImportParsedCount] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Add Employee Modal state
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showAddEmployeeFormModal, setShowAddEmployeeFormModal] = useState(false);
  const [employeeCredentials, setEmployeeCredentials] = useState<{
  name: string;
  email: string;
  temporaryPassword: string;
} | null>(null);
const [employeeSearch, setEmployeeSearch] = useState("");
const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState("All Departments");
const [employeePage, setEmployeePage] = useState(1);
const employeesPerPage = 5;
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("Software Developer");
  const [newEmpDept, setNewEmpDept] = useState("Software & Operations");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpPhone, setNewEmpPhone] = useState("");
// Edit Employee Modal state
const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
const [editEmpName, setEditEmpName] = useState("");
const [editEmpRole, setEditEmpRole] = useState("");
const [editEmpDept, setEditEmpDept] = useState("");
const [editEmpEmail, setEditEmpEmail] = useState("");
const [editEmpPhone, setEditEmpPhone] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Save authentication session
 const saveAuthSession = (session: AuthSession) => {
  setCurrentSession(session);
};

  // Perform Login with Password Verification
 const handleChangePassword = async (
  event: React.FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  setPasswordChangeError(null);

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    setPasswordChangeError("Please fill in all password fields.");
    return;
  }

  if (newPassword.length < 8) {
    setPasswordChangeError(
      "Your new password must contain at least 8 characters."
    );
    return;
  }

  if (newPassword !== confirmNewPassword) {
    setPasswordChangeError("New password and confirmation do not match.");
    return;
  }

  if (currentPassword === newPassword) {
    setPasswordChangeError(
      "Your new password must be different from your temporary password."
    );
    return;
  }

  const token = getAuthToken();

  if (!token) {
    setPasswordChangeError("Your login session has expired. Please log in again.");
    return;
  }

  setPasswordChangeLoading(true);

  try {
    const response = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      setPasswordChangeError(
        data.message || "Unable to change your password. Please try again."
      );
      return;
    }

    setCurrentSession((previous) =>
      previous
        ? { ...previous, mustChangePassword: false }
        : previous
    );

    setShowPasswordChange(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");

    setFeedbackMsg({
      type: "success",
      text: "Password changed successfully. You can now access your assigned tasks.",
    });
  } catch (error) {
    console.error("Password change error:", error);
    setPasswordChangeError(
      "Cannot connect to the server. Please check that the backend is running."
    );
  } finally {
    setPasswordChangeLoading(false);
  }
};
const handlePerformLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoginError(null);

  if (modalLoginRole === "admin") {
    if (!modalAdminId.trim() || !modalPassword) {
      setLoginError("Please enter your Admin ID and password.");
      return;
    }

    const res = await loginAdmin(modalAdminId, modalPassword);

    if (!res.success) {
      setLoginError(res.error || "Admin ID or password is incorrect.");
      return;
    }

    const adminSession: AuthSession = {
      name: res.user?.name || "Admin",
      email: res.user?.email || "payaldecor@gmail.com",
      role: res.user?.role || "System Administrator",
      isAdmin: true,
    };

    saveAuthSession(adminSession);
    setShowLoginModal(false);
    setModalPassword("");

    setFeedbackMsg({
      type: "success",
      text: "Logged in as Administrator (Unrestricted View across all 50 tasks).",
    });
  } else {
    if (!modalEmployeeId || !modalPassword) {
      setLoginError(
       "Please enter your registered employee email and password."
      );
      return;
    }

    const res = await loginEmployee(modalEmployeeId, modalPassword);

    if (!res.success) {
      setLoginError(res.error || "Employee login failed.");
      return;
    }

    if (res.user) {
     const empSession: AuthSession = {
  name: res.user.name,
  email: res.user.email,
  role: res.user.role,
  isAdmin: false,
  mustChangePassword: Boolean(res.user.mustChangePassword),
};

saveAuthSession(empSession);
setShowLoginModal(false);
setModalPassword("");

if (res.user.mustChangePassword) {
  setCurrentPassword("");
  setNewPassword("");
  setConfirmNewPassword("");
  setPasswordChangeError(null);
  setShowPasswordChange(true);
} else {
  setFeedbackMsg({
    type: "success",
    text: `Welcome back, ${res.user.name}! Showing only your assigned tasks.`,
  });
}
    }
  }
};


  // Log Out / Clear Session
  // Log Out / Clear Session
const handleLogout = () => {
  logout();
  window.location.replace("/login");
};

  // Load employees from localStorage
  // Load employees from PostgreSQL
// Load employees from PostgreSQL whenever Admin session becomes active
useEffect(() => {
  const loadEmployees = async () => {
    if (!currentSession.isAdmin) {
      setEmployees([]);
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setEmployees([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/employees`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success || !Array.isArray(data.employees)) {
        throw new Error(data.message || "Unable to load employees.");
      }

      const apiEmployees: Employee[] = data.employees.map((item: any) => ({
  id: String(item.id),
  name: item.full_name || "",
  email: item.email || "",
  role: item.designation || "",
  department: item.department || "",
  phone: item.phone || "",
  status: item.status === "Inactive" ? "Inactive" : "Active",
  avatarColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
}));

      setEmployees(apiEmployees);

      console.log("Employees loaded from PostgreSQL:", apiEmployees.length);
    } catch (error) {
      console.error("Employee loading failed:", error);
      setEmployees([]);
      setFeedbackMsg({
        type: "error",
        text: "Unable to load employees from the database. Please refresh and try again.",
      });
    }
  };

  void loadEmployees();
}, [currentSession.isAdmin]);
  

  // Load tasks: Preserve user's PD-001 to PD-047 with employee assignments
 
  // Load tasks exclusively from PostgreSQL
  const loadTasks = useCallback(async () => {
    setLoading(true);

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error("Your login session has expired. Please log in again.");
      }

      const res = await fetch(`${API_BASE}/operations`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success || !Array.isArray(data.tasks)) {
        throw new Error(data.message || "Unable to load Operations tasks.");
      }

      const apiTasks: OperationTask[] = data.tasks.map((item: any) => {
        let emp = String(item.employee || "").toLowerCase();

        if (emp.includes("disha")) emp = "Disha";
        else if (emp.includes("gaurav")) emp = "Gaurav";
        else if (emp.includes("sairaj")) emp = "Sairaj";
        else if (emp.includes("saniya")) emp = "Saniya";
        else emp = item.employee || "";

        return {
          id: String(item.id),
          taskId: item.taskId,
          workstream: item.workstream || "General",
          taskActivity: item.taskActivity || "",
          priority: (item.priority || "Medium") as PriorityLevel,
          employee: emp,
          primaryResponsible: item.primaryResponsible || "",
          supportingRole: item.supportingRole || "",
          expectedDeliverable: item.expectedDeliverable || "",
          targetDate: item.targetDate
            ? String(item.targetDate).slice(0, 10)
            : "",
          status: (item.status || "Not Started") as TaskStatus,
          remarks: item.remarks || "",
          others: item.others || "",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });

      setTasks(apiTasks);
    } catch (error) {
      console.error("Operations loading error:", error);
      setTasks([]);
      alert(
        error instanceof Error
          ? error.message
          : "Unable to connect to the Operations database."
      );
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // Sync to local storage when tasks change
  const persistTasks = (newTasks: OperationTask[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTasks));
    } catch (e) {
      console.error("Local storage error:", e);
    }
  };

  // ------------------------------------------------------------
  // STRICT TASK ISOLATION BASED ON AUTHENTICATED USER SESSION:
  // If logged in as Disha, she can ONLY see Disha's tasks.
  // There is NO dropdown that lets Disha look into Sairaj or Saniya's tasks!
  // If logged in as Sairaj, only Sairaj's tasks are visible.
  // If logged in as Saniya, only Saniya's tasks are visible.
  // Only Admin has cross-employee visibility.
  // ------------------------------------------------------------
  const isolatedTasks = useMemo(() => {
    if (currentSession.isAdmin) {
      return tasks;
    }
    const currentName = currentSession.name.trim().toLowerCase();
    return tasks.filter((t) => {
      const emp = (t.employee || "").trim().toLowerCase();
      return emp === currentName || emp.includes(currentName) || currentName.includes(emp);
    });
  }, [tasks, currentSession]);

  // Secondary Filter: Search, Workstream, Status, Priority
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return isolatedTasks.filter((t) => {
      const matchSearch =
        !q ||
        [
          t.taskId,
          t.workstream,
          t.taskActivity,
          t.employee,
          t.primaryResponsible,
          t.supportingRole,
          t.expectedDeliverable,
          t.remarks,
        ].some((val) => String(val || "").toLowerCase().includes(q));

      const matchWorkstream =
        workstreamFilter === "All" || t.workstream === workstreamFilter;
      const matchStatus = statusFilter === "All" || t.status === statusFilter;
      const matchPriority =
        priorityFilter === "All" || t.priority === priorityFilter;

      return matchSearch && matchWorkstream && matchStatus && matchPriority;
    });
  }, [isolatedTasks, search, workstreamFilter, statusFilter, priorityFilter]);

  // Statistics counters (strictly calculated for the logged-in user's tasks)
  const totalTasks = isolatedTasks.length;
  const inProgressCount = isolatedTasks.filter((t) => t.status === "In Progress").length;
  const completedCount = isolatedTasks.filter((t) => t.status === "Completed").length;
  const notStartedCount = isolatedTasks.filter(
    (t) => t.status === "Not Started" || t.status === "Pending"
  ).length;
  const onHoldCount = isolatedTasks.filter((t) => t.status === "On Hold").length;
  const blockedCount = isolatedTasks.filter((t) => t.status === "Blocked").length;
  const criticalOrHighCount = isolatedTasks.filter(
    (t) => t.priority === "Critical" || t.priority === "High" || t.priority === "Urgent"
  ).length;

  // Open Create Task form
  const handleOpenCreate = () => {
    const nextId = getNextTaskId(tasks);
    // When employee creates task, auto-assign strictly to them!
    const defaultEmp = currentSession.isAdmin ? "Disha" : currentSession.name;
    setForm(emptyFormData(nextId, defaultEmp));
    setEditingId(null);
    setFeedbackMsg(null);
    setShowModal(true);
  };

  // Open Edit Task form
  const handleOpenEdit = (task: OperationTask) => {
    setForm({
      taskId: task.taskId,
      workstream: task.workstream,
      taskActivity: task.taskActivity,
      priority: task.priority,
      employee: task.employee || currentSession.name,
      primaryResponsible: task.primaryResponsible,
      supportingRole: task.supportingRole,
      expectedDeliverable: task.expectedDeliverable,
      targetDate: task.targetDate || "",
      status: task.status,
      remarks: task.remarks || "",
      others: "",
    });
    setEditingId(task.id);
    setFeedbackMsg(null);
    setShowModal(true);
  };

  // Save Task (Create or Update)

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.taskActivity.trim()) {
      setFeedbackMsg({
        type: "error",
        text: "Please enter Task / Activity description.",
      });
      return;
    }

    if (!form.primaryResponsible.trim()) {
      setFeedbackMsg({
        type: "error",
        text: "Please enter Primary Responsible Person.",
      });
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setFeedbackMsg({
        type: "error",
        text: "Your login session has expired. Please log in again.",
      });
      return;
    }

    setSaving(true);
    setFeedbackMsg(null);

    try {
      let finalTaskId = form.taskId.trim().toUpperCase();

      if (!finalTaskId) {
        finalTaskId = getNextTaskId(tasks);
      } else if (!finalTaskId.startsWith("PD-")) {
        finalTaskId = `PD-${finalTaskId}`;
      }

      const payload = {
        ...form,
        taskId: finalTaskId,
        employee: currentSession.isAdmin
          ? form.employee
          : currentSession.name,
        others: "",
      };

      const isEditing = Boolean(editingId);

      const res = await fetch(
        isEditing
          ? `${API_BASE}/operations/${editingId}`
          : `${API_BASE}/operations`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const resData = await res.json().catch(() => ({}));

      if (!res.ok || !resData.success || !resData.task) {
        throw new Error(
          resData.message ||
            `Unable to ${isEditing ? "update" : "create"} task.`
        );
      }

      // Refresh the task list from PostgreSQL.
      await loadTasks();

      setShowModal(false);
      setFeedbackMsg({
        type: "success",
        text: isEditing
          ? `Task ${finalTaskId} updated successfully.`
          : `Task ${finalTaskId} created and assigned to ${payload.employee}!`,
      });
    } catch (error) {
      console.error("Task save error:", error);
      setFeedbackMsg({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save task to the database.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (task: OperationTask) => {
    if (
      !window.confirm(
        `Are you sure you want to delete task ${task.taskId} ("${task.taskActivity.slice(0, 30)}...")?`
      )
    ) {
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setFeedbackMsg({
        type: "error",
        text: "Your login session has expired. Please log in again.",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/operations/${task.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok || !resData.success) {
        throw new Error(resData.message || "Unable to delete task.");
      }

      // Update the screen only after the database confirms deletion.
      setTasks((current) =>
        current.filter((item) => item.id !== task.id)
      );

      if (viewingTask?.id === task.id) {
        setViewingTask(null);
      }

      setFeedbackMsg({
        type: "success",
        text: `Task ${task.taskId} deleted.`,
      });
    } catch (error) {
      console.error("Task deletion error:", error);
      setFeedbackMsg({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to delete task from the database.",
      });
    }
  };

  // Quick Status Change directly from dropdown
  const handleStatusChange = async (
    task: OperationTask,
    newStatus: TaskStatus
  ) => {
    const token = getAuthToken();

    if (!token) {
      setFeedbackMsg({
        type: "error",
        text: "Your login session has expired. Please log in again.",
      });
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/operations/${task.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const resData = await res.json().catch(() => ({}));

      if (!res.ok || !resData.success) {
        throw new Error(
          resData.message || "Unable to update task status."
        );
      }

      // Update the screen only after the database confirms the change.
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setFeedbackMsg({
        type: "success",
        text: `Task ${task.taskId} status updated to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Task status update error:", error);
      setFeedbackMsg({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update task status in the database.",
      });
    }
  };


  // Add Employee Handler
 
// Add Employee Handler - Save to PostgreSQL

const handleAddEmployee = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!newEmpName.trim()) {
    alert("Please enter employee name.");
    return;
  }

  const token = getAuthToken();

  if (!token) {
    setFeedbackMsg({
      type: "error",
      text: "Your session has expired. Please log in again.",
    });
    return;
  }

  const cleanName =
    newEmpName.trim().charAt(0).toUpperCase() +
    newEmpName.trim().slice(1);

  const employeeData = {
    full_name: cleanName,
    email:
      newEmpEmail.trim() ||
      `${cleanName.toLowerCase().replace(/\s+/g, ".")}@payaldecor.com`,
    phone: newEmpPhone.trim(),
    designation: newEmpRole.trim(),
    department: newEmpDept.trim(),
    status: "Active",
  };

  try {
    const response = await fetch(`${API_BASE}/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(employeeData),
    });

    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      !data.employee ||
      !data.loginCredentials?.temporaryPassword
    ) {
      throw new Error(
        data.message || "Unable to create employee login account."
      );
    }

    const savedEmployee = data.employee;

    const newEmployee: Employee = {
      id: String(savedEmployee.id),
      name: savedEmployee.full_name,
      email: savedEmployee.email || "",
      role: savedEmployee.designation || "",
      department: savedEmployee.department || "",
      phone: savedEmployee.phone || "",
      status:
        savedEmployee.status === "Inactive" ? "Inactive" : "Active",
      avatarColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    };

    setEmployees((previous) => [...previous, newEmployee]);

    // Keep temporary credentials in React memory only.
    setEmployeeCredentials({
      name: newEmployee.name,
      email: data.loginCredentials.email,
      temporaryPassword: data.loginCredentials.temporaryPassword,
    });

    setNewEmpName("");
    setNewEmpEmail("");
    setNewEmpPhone("");
    setNewEmpRole("");
    setNewEmpDept("");

    setFeedbackMsg({
      type: "success",
      text: `Employee "${newEmployee.name}" and login account created successfully.`,
    });

    setShowAddEmployeeFormModal(false);
  } catch (error) {
    console.error("Employee creation failed:", error);

    setFeedbackMsg({
      type: "error",
      text:
        error instanceof Error
          ? error.message
          : "Unable to save employee.",
    });
  }
};

// Open Edit Employee Modal
const handleOpenEditEmployee = (emp: Employee) => {
  setEditingEmployee(emp);
  setEditEmpName(emp.name);
  setEditEmpRole(emp.role);
  setEditEmpDept(emp.department);
  setEditEmpEmail(emp.email);
  setEditEmpPhone(emp.phone || "");
  setShowEditEmployeeModal(true);
};
// Save edited employee to PostgreSQL
const handleUpdateEmployee = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!editingEmployee) return;

  if (!editEmpName.trim()) {
    alert("Please enter employee name.");
    return;
  }

  const token = getAuthToken();

  if (!token) {
    setFeedbackMsg({
      type: "error",
      text: "Your session has expired. Please log in again.",
    });
    return;
  }

 const employeeData = {
  full_name: editEmpName.trim(),
  email: editEmpEmail.trim(),
  phone: editEmpPhone.trim(),
  designation: editEmpRole.trim(),
  department: editEmpDept.trim(),
  status: editingEmployee.status || "Active",
};

  try {
    const response = await fetch(
      `${API_BASE}/employees/${editingEmployee.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(employeeData),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success || !data.employee) {
      throw new Error(data.message || "Unable to update employee.");
    }

    const saved = data.employee;

    setEmployees((previous) =>
      previous.map((emp) =>
        emp.id === String(saved.id)
         ? {
    ...emp,
    name: saved.full_name,
    email: saved.email || "",
    phone: saved.phone || "",
    role: saved.designation || "",
    department: saved.department || "",
    status: saved.status === "Inactive" ? "Inactive" : "Active",
  }
          : emp
      )
    );

    setShowEditEmployeeModal(false);
    setEditingEmployee(null);

    setFeedbackMsg({
      type: "success",
      text: `Employee "${saved.full_name}" updated successfully in PostgreSQL.`,
    });
  } catch (error) {
    console.error("Employee update failed:", error);

    setFeedbackMsg({
      type: "error",
      text:
        error instanceof Error
          ? error.message
          : "Unable to update employee.",
    });
  }
};

// Deactivate employee in PostgreSQL
const handleDeactivateEmployee = async (emp: Employee) => {
  if (!window.confirm(`Are you sure you want to deactivate ${emp.name}?`)) {
    return;
  }

  const token = getAuthToken();

  if (!token) {
    setFeedbackMsg({
      type: "error",
      text: "Your session has expired. Please log in again.",
    });
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/employees/${emp.id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to deactivate employee.");
    }

    setEmployees((previous) =>
      previous.map((item) =>
        item.id === emp.id ? { ...item, status: "Inactive" } : item
      )
    );

    setFeedbackMsg({
      type: "success",
      text: `${emp.name} has been deactivated successfully.`,
    });
  } catch (error) {
    console.error("Employee deactivation failed:", error);
    setFeedbackMsg({
      type: "error",
      text:
        error instanceof Error
          ? error.message
          : "Unable to deactivate employee.",
    });
  }
};

// Reactivate employee in PostgreSQL
const handleReactivateEmployee = async (emp: Employee) => {
  const token = getAuthToken();

  if (!token) {
    setFeedbackMsg({
      type: "error",
      text: "Your session has expired. Please log in again.",
    });
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/employees/${emp.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name: emp.name,
        email: emp.email,
        phone: emp.phone || "",
        designation: emp.role,
        department: emp.department,
        status: "Active",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to reactivate employee.");
    }

    setEmployees((previous) =>
      previous.map((item) =>
        item.id === emp.id ? { ...item, status: "Active" } : item
      )
    );

    setFeedbackMsg({
      type: "success",
      text: `${emp.name} has been reactivated successfully.`,
    });
  } catch (error) {
    console.error("Employee reactivation failed:", error);
    setFeedbackMsg({
      type: "error",
      text:
        error instanceof Error
          ? error.message
          : "Unable to reactivate employee.",
    });
  }
};

  // Export CSV (Exports currently isolated and filtered tasks)
  const handleExportCSV = () => {
    if (filteredTasks.length === 0) {
      alert("No tasks to export.");
      return;
    }

    const headers = [
      "Task ID",
      "Workstream",
      "Task / Activity",
      "Priority",
      "Employee",
      "Primary Responsible Person",
      "Supporting Role",
      "Expected Deliverable",
      "Target Date",
      "Status",
      "Remarks / Blockers",
      "Others",
    ];

    const rows = filteredTasks.map((t) => [
      `"${t.taskId || ""}"`,
      `"${t.workstream || ""}"`,
      `"${(t.taskActivity || "").replace(/"/g, '""')}"`,
      `"${t.priority || ""}"`,
      `"${(t.employee || "").replace(/"/g, '""')}"`,
      `"${(t.primaryResponsible || "").replace(/"/g, '""')}"`,
      `"${(t.supportingRole || "").replace(/"/g, '""')}"`,
      `"${(t.expectedDeliverable || "").replace(/"/g, '""')}"`,
      `"${t.targetDate || ""}"`,
      `"${t.status || ""}"`,
      `"${(t.remarks || "").replace(/"/g, '""')}"`,
      `""`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const suffix = currentSession.isAdmin ? "admin_all" : currentSession.name.toLowerCase();
    link.setAttribute(
      "download",
      `operations_tasks_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download CSV Template for Import
  const handleDownloadTemplate = () => {
    const headers = [
      "Task ID",
      "Workstream",
      "Task / Activity",
      "Priority",
      "Employee",
      "Primary Responsible Person",
      "Supporting Role",
      "Expected Deliverable",
      "Target Date",
      "Status",
      "Remarks / Blockers",
      "Others",
    ];
    const sample = [
      "PD-048",
      "Software & Operations",
      "Build live notifications for task updates",
      "High",
      "Disha",
      "Software Developer",
      "Project Manager",
      "Real-time task notification component",
      "2026-11-20",
      "In Progress",
      "Requires WebSocket or SSE",
      "",
    ];

    const csv = [headers.join(","), sample.map((s) => `"${s}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "payal_decor_task_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV Helper
  const parseCSVString = (csvText: string): OperationTask[] => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const result: OperationTask[] = [];
    const parseLine = (line: string): string[] => {
      const row: string[] = [];
      let inQuotes = false;
      let cur = "";
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === "," && !inQuotes) {
          row.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      }
      row.push(cur.trim());
      return row;
    };

    const headerRow = parseLine(lines[0] || "").map((h) => h.toLowerCase());
    const findIndex = (keywords: string[]) => {
      return headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));
    };

    const idIdx = findIndex(["id"]);
    const wsIdx = findIndex(["workstream"]);
    const actIdx = headerRow.findIndex(
  (h) =>
    h.includes("task / activity") ||
    h === "task activity" ||
    h === "activity"
);
    const priIdx = findIndex(["priority"]);
    const empIdx = findIndex(["employee", "assignee", "owner"]);
    const prIdx = findIndex(["primary", "responsible"]);
    const srIdx = findIndex(["supporting", "role"]);
    const delIdx = findIndex(["deliverable", "expected"]);
    const tdIdx = findIndex(["date", "target"]);
    const stIdx = findIndex(["status"]);
    const remIdx = findIndex(["remark", "blocker"]);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = parseLine(line);
      if (cols.length === 0 || !cols.some((c) => c.length > 0)) continue;

      const act = actIdx !== -1 && cols[actIdx] ? cols[actIdx] : cols[2] || cols[1] || "";
      if (!act) continue;

      let rawId = idIdx !== -1 && cols[idIdx] ? cols[idIdx].trim().toUpperCase() : "";
      if (!rawId) {
        rawId = `PD-${String(result.length + 100).padStart(3, "0")}`;
      } else if (!rawId.startsWith("PD-")) {
        rawId = `PD-${rawId}`;
      }

      const rawPri = priIdx !== -1 && cols[priIdx] ? cols[priIdx] : "High";
      const validPri: PriorityLevel = ["Critical", "Urgent", "High", "Medium", "Low"].includes(rawPri)
        ? (rawPri as PriorityLevel)
        : "Medium";

      const rawSt = stIdx !== -1 && cols[stIdx] ? cols[stIdx] : "Not Started";
      const validStatus: TaskStatus = STATUS_OPTIONS.includes(rawSt as TaskStatus)
        ? (rawSt as TaskStatus)
        : "Not Started";

      let empName = empIdx !== -1 && cols[empIdx] ? cols[empIdx].trim() : currentSession.name;
      if (empName.toLowerCase().includes("disha")) empName = "Disha";
      else if (empName.toLowerCase().includes("sairaj")) empName = "Sairaj";
      else if (empName.toLowerCase().includes("saniya")) empName = "Saniya";

      result.push({
        id: `import-${Date.now()}-${i}`,
        taskId: rawId,
        workstream: wsIdx !== -1 && cols[wsIdx] ? cols[wsIdx] : "Software & Operations",
        taskActivity: act,
        priority: validPri,
        employee: empName,
        primaryResponsible: prIdx !== -1 && cols[prIdx] ? cols[prIdx] : "Software Developer",
        supportingRole: srIdx !== -1 && cols[srIdx] ? cols[srIdx] : "",
        expectedDeliverable: delIdx !== -1 && cols[delIdx] ? cols[delIdx] : "",
        targetDate: tdIdx !== -1 && cols[tdIdx] ? cols[tdIdx].slice(0, 10) : new Date().toISOString().slice(0, 10),
        status: validStatus,
        remarks: remIdx !== -1 && cols[remIdx] ? cols[remIdx] : "",
        others: "",
      });
    }

    return result;
  };

  // Handle CSV file selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      setImportText(text);
      const parsed = parseCSVString(text);
      setImportParsedCount(parsed.length);
      setImportError(null);
    };
    reader.onerror = () => {
      setImportError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  // Execute Import
  
  // Execute Import - Save tasks to PostgreSQL
  const handleExecuteImport = async () => {
    if (!importText.trim()) {
      setImportError("Please upload or paste CSV data first.");
      return;
    }

    if (importMode === "replace") {
      setImportError(
        "Replace All is temporarily disabled to protect existing database tasks. Please select Append Tasks."
      );
      return;
    }

    const parsed = parseCSVString(importText);

    if (parsed.length === 0) {
      setImportError(
        "Could not parse any valid tasks. Check formatting and headers."
      );
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setImportError("Your login session has expired. Please log in again.");
      return;
    }

    // Prepare unique Task IDs without changing existing database tasks.
    const usedIds = new Set(tasks.map((task) => task.taskId));
    const prepared: OperationTask[] = [];

    for (const task of parsed) {
      let finalTaskId = task.taskId.trim().toUpperCase();

      if (usedIds.has(finalTaskId)) {
        finalTaskId = getNextTaskId([
          ...tasks,
          ...prepared,
        ]);
      }

      usedIds.add(finalTaskId);
      prepared.push({
        ...task,
        taskId: finalTaskId,
      });
    }

    setSaving(true);
    setImportError(null);
    setFeedbackMsg(null);

    let importedCount = 0;
    let failedTaskId = "";
    let failureMessage = "";

    try {
      for (const task of prepared) {
        const payload = {
          taskId: task.taskId,
          workstream: task.workstream,
          taskActivity: task.taskActivity,
          priority: task.priority,
          primaryResponsible: task.primaryResponsible,
          supportingRole: task.supportingRole,
          expectedDeliverable: task.expectedDeliverable,
          targetDate: task.targetDate || null,
          status: task.status,
          remarks: task.remarks,
          others: task.others,
          employee: task.employee,
        };

        const response = await fetch(`${API_BASE}/operations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok || !responseData.success || !responseData.task) {
          failedTaskId = task.taskId;
          failureMessage =
            responseData.message || `Unable to import ${task.taskId}.`;
          break;
        }

        importedCount++;
      }

      if (importedCount > 0) {
        await loadTasks();

        // Clear imported CSV to prevent accidental duplicate imports.
        setShowImportModal(false);
        setImportText("");
        setImportParsedCount(null);
      }

      if (importedCount === prepared.length) {
        setFeedbackMsg({
          type: "success",
          text: `Successfully imported ${importedCount} tasks into PostgreSQL.`,
        });
      } else {
        setFeedbackMsg({
          type: "error",
          text: `Imported ${importedCount} of ${prepared.length} tasks. Failed at ${failedTaskId}: ${failureMessage}`,
        });
      }
    } catch (error) {
      console.error("CSV database import error:", error);

      setFeedbackMsg({
        type: "error",
        text:
          error instanceof Error
            ? `Import error: ${error.message}`
            : "An unexpected error occurred during CSV import.",
      });
    } finally {
      setSaving(false);
    }
  };


 const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors";

// Employee Management: search and department filtering
const filteredEmployees = employees.filter((emp) => {
  const searchText = employeeSearch.trim().toLowerCase();

  const matchesSearch =
    !searchText ||
    emp.name.toLowerCase().includes(searchText) ||
    emp.email.toLowerCase().includes(searchText) ||
    emp.role.toLowerCase().includes(searchText) ||
    emp.department.toLowerCase().includes(searchText);

  const matchesDepartment =
    employeeDepartmentFilter === "All Departments" ||
    emp.department === employeeDepartmentFilter;

  return matchesSearch && matchesDepartment;
});
// Employee Summary Calculations

const totalEmployees = employees.length;

const activeEmployees = employees.filter(
  (emp) => emp.status?.toLowerCase() === "active" || !emp.status
).length;

const departmentCounts = employees.reduce<Record<string, number>>(
  (counts, emp) => {
    const department = emp.department?.trim() || "Unassigned";
    counts[department] = (counts[department] || 0) + 1;
    return counts;
  },
  {}
);

const totalDepartments = Object.keys(departmentCounts).length;


// Employee Directory Pagination
const totalEmployeePages = Math.max(
  1,
  Math.ceil(filteredEmployees.length / employeesPerPage)
);

const safeEmployeePage = Math.min(employeePage, totalEmployeePages);

const paginatedEmployees = filteredEmployees.slice(
  (safeEmployeePage - 1) * employeesPerPage,
  safeEmployeePage * employeesPerPage
);
return (
    <AppShell title="Operations">
      <div className="space-y-4 p-4 md:p-6">
        {/* ============================================================ */}
        {/* TOP HEADER & ALL ACTION BUTTONS IN THE SAME LINE             */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                Daily Execution & Tracker
              </span>
              <span className="text-xs text-gray-400">â€¢</span>
              <span className="text-xs text-gray-500">
                Payal Decor Modular Furniture
              </span>
            </div>
            <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
              <CheckSquare className="h-6 w-6 text-blue-600" />
              Operations Module
            </h1>
          </div>

          {/* ALL BUTTONS STRICTLY IN THE SAME LINE (NO WRAPPING) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 shrink-0 flex-nowrap">
            {/* 1. Refresh */}
            <button
              type="button"
              onClick={() => void loadTasks()}
              title="Refresh tracker"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 whitespace-nowrap transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
              Refresh
            </button>

            {/* 2. Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTasks.length === 0}
              title="Export tasks to CSV"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-gray-500" />
              Export
            </button>

            {/* 3. Import (Side of Export) */}
            <button
              type="button"
              onClick={() => {
                setShowImportModal(true);
                setImportError(null);
                setImportText("");
                setImportParsedCount(null);
              }}
              title="Import tasks from CSV"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50/70 px-3 py-2 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-100 whitespace-nowrap transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              Import
            </button>

            {/* 4. Add Employee */}
            <button
              type="button"
             onClick={() => {
  setEmployeeSearch("");
  setEmployeeDepartmentFilter("All Departments");
  setShowEmployeeModal(true);
}}
              title="Manage employees"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50/70 px-3 py-2 text-xs font-semibold text-purple-700 shadow-2xs hover:bg-purple-100 whitespace-nowrap transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5 text-purple-600" />
             Employee Management
            </button>

            {/* 5. Employee Login (ONLY visible when logged in as Admin) */}
            {currentSession.isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setModalPassword("");
                  setLoginError(null);
                  setShowLoginModal(true);
                }}
                title="Sign in as Employee or Admin to view assigned tasks"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 whitespace-nowrap transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
                Employee Login
              </button>
            )}

            {/* 6. Create Task */}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 active:scale-[0.98] whitespace-nowrap transition-all"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              Create Task
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECURE EMPLOYEE LOGIN & IDENTITY STATUS BANNER               */}
        {/* Shows who is logged in and enforces task isolation.           */}
        {/* ============================================================ */}
        <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-blue-50/90 p-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-700 text-white shadow-xs font-bold text-sm select-none">
              {currentSession.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  Active Account:
                </span>
                <span className="rounded-md bg-purple-200/80 px-2 py-0.5 text-xs font-bold text-purple-900">
                  {currentSession.name} ({currentSession.email})
                </span>
                <span className="text-xs text-purple-700 font-medium">
                  â€¢ {currentSession.role}
                </span>
              </div>
              <p className="text-xs text-purple-900/80 mt-0.5">
                {currentSession.isAdmin ? (
                  <span className="font-semibold text-blue-800">
                    ðŸ›¡ï¸ Administrator Access: Full organization view across all team tasks.
                  </span>
                ) : (
                  <span>
                    ðŸ”’ <strong>Strict Task Privacy Active:</strong> Logged in as <strong>{currentSession.name}</strong>. Only tasks assigned to {currentSession.name} are visible in this workspace.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Alert Message */}
        {feedbackMsg && (
          <div
            className={`flex items-center justify-between rounded-xl border p-3 text-sm ${
              feedbackMsg.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="rounded p-1 text-gray-400 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Metric KPI Overview Cards (Strictly scoped to logged in employee) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                {currentSession.isAdmin ? "Total Tasks" : `${currentSession.name}'s Tasks`}
              </span>
              <Layers className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-gray-900">{totalTasks}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              {currentSession.isAdmin ? "All company tasks" : "Assigned directly to you"}
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-600">
                In Progress
              </span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-blue-700">
              {inProgressCount}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Active execution</p>
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-600">
                Completed
              </span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-green-700">
              {completedCount}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Milestones achieved</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                Not Started
              </span>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-gray-700">
              {notStartedCount}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Upcoming queue</p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-600">
                On Hold / Issues
              </span>
              <PauseCircle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-amber-700">
              {onHoldCount + blockedCount}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Pending clarity</p>
          </div>

          <div className="rounded-xl border border-red-100 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-600">
                Critical & High
              </span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-red-700">
              {criticalOrHighCount}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">High priority</p>
          </div>
        </div>

        {/* Table & Controls Section */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          {/* Controls Bar: Search, Filters, and Counters */}
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  Daily Execution Records
                </h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
                </span>
                {!currentSession.isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                    <Lock className="h-3 w-3" />
                    Private to {currentSession.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentSession.isAdmin
                  ? "Showing all Payal Decor tasks across all team members"
                  : `Showing exclusively tasks assigned to ${currentSession.name} (other members' tasks hidden)`}
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 sm:flex-none">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Task ID, Activity..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>

              {/* Workstream Filter */}
              <select
                aria-label="Filter by workstream"
                value={workstreamFilter}
                onChange={(e) => setWorkstreamFilter(e.target.value)}
                className={`${inputClass} w-auto text-xs`}
              >
                <option value="All">All Workstreams</option>
                {WORKSTREAM_OPTIONS.map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${inputClass} w-auto text-xs`}
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`${inputClass} w-auto text-xs`}
              >
                <option value="All">All Priorities</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {(search ||
                workstreamFilter !== "All" ||
                statusFilter !== "All" ||
                priorityFilter !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setWorkstreamFilter("All");
                    setStatusFilter("All");
                    setPriorityFilter("All");
                  }}
                  className="rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Main Table: Employee column strictly after Priority */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-sm text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mb-2" />
              Loading operations daily tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <CheckSquare className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-base font-semibold text-gray-700">
                No matching tasks found
              </p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                {!currentSession.isAdmin
                  ? `No tasks currently assigned to ${currentSession.name} match the filters.`
                  : "Try clearing your search query or filters."}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setWorkstreamFilter("All");
                    setStatusFilter("All");
                    setPriorityFilter("All");
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
           

<div className="overflow-x-auto">
  <table className="w-full min-w-[1050px] text-left">
    <thead className="bg-gray-50">
      <tr className="border-b border-gray-200">
        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Employee
        </th>
        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Designation
        </th>
        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Department
        </th>
        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Assigned Tasks
        </th>
        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Status
        </th>
        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
          Actions
        </th>
      </tr>
    </thead>

    <tbody className="divide-y divide-gray-100">
      {filteredEmployees.map((emp) => {
        const assignedCount = tasks.filter(
          (t) =>
            (t.employee || "").toLowerCase() === emp.name.toLowerCase()
        ).length;

        return (
          <tr key={emp.id} className="transition hover:bg-purple-50/40">
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-200 bg-purple-100 text-sm font-bold text-purple-800">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {emp.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {emp.email || "No work email"}
                  </p>
                </div>
              </div>
            </td>

            <td className="px-4 py-3 text-sm text-gray-700">
              {emp.role || "â€”"}
            </td>

            <td className="px-4 py-3">
              <span className="inline-flex rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                {emp.department || "â€”"}
              </span>
            </td>

            <td className="px-4 py-3">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                {assignedCount} tasks
              </span>
            </td>

            <td className="px-4 py-3">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  emp.status === "Inactive"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {emp.status || "Active"}
              </span>
            </td>

            <td className="px-4 py-3">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditEmployee(emp)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>

                {emp.status === "Inactive" ? (
                  <button
                    type="button"
                    onClick={() => handleReactivateEmployee(emp)}
                    className="inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                  >
                    Reactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeactivateEmployee(emp)}
                    className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}

      {filteredEmployees.length === 0 && (
        <tr>
          <td colSpan={6} className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-gray-700">
              No employees found
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Try another search term or department.
            </p>
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

          )}
        </section>

        {/* ============================================================ */}
        {/* EMPLOYEE & ADMIN LOGIN MODAL (WITH DROPDOWN & OWN PASSWORD)  */}
        {/* ============================================================ */}
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Sign In to Workspace
                    </h3>
                    <p className="text-xs text-gray-500">
                      Select role and enter credentials
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowLoginModal(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handlePerformLogin} className="mt-4 space-y-3.5">
                {loginError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Dropdown: Role Selection (Admin or Employee) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Sign In As <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalLoginRole}
                    onChange={(e) => {
                      setModalLoginRole(e.target.value as "admin" | "employee");
                      setLoginError(null);
                      setModalPassword("");
                    }}
                    className={inputClass}
                  >
                    <option value="admin">Administrator (Superuser / Master View)</option>
                    <option value="employee">Employee (Private Workspace & Personal Tasks)</option>
                  </select>
                </div>

                {modalLoginRole === "admin" ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Admin ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={modalAdminId}
                      onChange={(e) => setModalAdminId(e.target.value)}
                      placeholder="admin"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                ) : (
                
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1">
      Employee Login Email <span className="text-red-500">*</span>
    </label>
    <input
      type="email"
      required
      value={modalEmployeeId}
      onChange={(e) => {
        setModalEmployeeId(e.target.value);
        setLoginError(null);
        setModalPassword("");
      }}
      placeholder="Enter your registered employee email"
      autoComplete="username"
      className={inputClass}
    />
  </div>
)}

                {/* Password input with toggle */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {modalLoginRole === "admin" ? "Admin Password" : "Employee Password"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showModalPassword ? "text" : "password"}
                      required
                      value={modalPassword}
                      onChange={(e) => setModalPassword(e.target.value)}
                      placeholder={
                        modalLoginRole === "admin"
                          ? "Enter admin password"
                          : "Enter your employee password"
                      }
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword((v) => !v)}
                      aria-label={showModalPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    >
                      {showModalPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {modalLoginRole === "admin"
                      ? "Admin access unlocks master visibility across all 47 tasks."
                      : "Employee accounts show strictly the tasks assigned to that employee."}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-purple-800 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In to Workspace
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
{showPasswordChange && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">
          Change Temporary Password
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          For security, you must create a new password before accessing your employee dashboard.
        </p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Temporary Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            placeholder="Enter your temporary password"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            placeholder="Minimum 8 characters"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className={inputClass}
            placeholder="Re-enter your new password"
          />
        </div>

        {passwordChangeError && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {passwordChangeError}
          </p>
        )}

        <button
          type="submit"
          disabled={passwordChangeLoading}
          className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {passwordChangeLoading ? "Updating Password..." : "Change Password"}
        </button>
      </form>
    </div>
  </div>
)}

               


                {/* IMPORT TASKS MODAL (JUST SIDE OF EXPORT)                    */}
        {/* ============================================================ */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Import Operations Tasks (CSV)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Upload a CSV file or paste formatted rows directly
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowImportModal(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                  <div className="flex items-center gap-2 text-xs text-blue-900">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    <span>
                      Columns: <strong>Task ID, Workstream, Task / Activity, Priority, Employee, Primary Responsible, Supporting Role, Expected Deliverable, Target Date, Status, Remarks</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1 shrink-0 rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 shadow-2xs"
                  >
                    <Download className="h-3 w-3" />
                    Template
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Upload CSV File:
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-lg p-1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Or Paste CSV Data Directly:
                  </label>
                  <textarea
                    rows={5}
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      const parsed = parseCSVString(e.target.value);
                      setImportParsedCount(parsed.length);
                      setImportError(null);
                    }}
                    placeholder={`"Task ID","Workstream","Task / Activity","Priority","Employee","Primary Responsible Person","Supporting Role","Expected Deliverable","Target Date","Status","Remarks","Others"\n"PD-048","Software & Operations","Build client portal","High","Disha","Software Developer","Project Manager","Portal MVP","2026-11-25","Not Started","",""`}
                    className={`${inputClass} font-mono text-xs`}
                  />
                  {importParsedCount !== null && (
                    <p className="mt-1 text-xs font-semibold text-green-700 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      Detected {importParsedCount} valid task {importParsedCount === 1 ? "row" : "rows"} ready to import.
                    </p>
                  )}
                  {importError && (
                    <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {importError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Import Mode:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                      importMode === "append" ? "border-blue-500 bg-blue-50/50" : "border-gray-200"
                    }`}>
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "append"}
                        onChange={() => setImportMode("append")}
                        className="mt-0.5 text-blue-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900">Append Tasks</span>
                        <p className="text-[11px] text-gray-500">Keep current tasks and append new rows</p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                      importMode === "replace" ? "border-amber-500 bg-amber-50/50" : "border-gray-200"
                    }`}>
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-amber-900">Replace All</span>
                        <p className="text-[11px] text-gray-500">Overwrite existing tasks with this file</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4" />
                    Confirm Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ADD EMPLOYEE MODAL (CONFIGURED DISHA, SAIRAJ, SANIYA)        */}
        {/* ============================================================ */}
        {showEmployeeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs overflow-y-auto">
           <div className="relative w-full max-w-6xl rounded-2xl bg-white p-6 shadow-xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                    Employee Management
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Manage employee profiles, departments, designations and assignments
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowEmployeeModal(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

            
              {/* Employee Management Toolbar */}

<div className="mt-5 flex flex-col gap-5">

  {/* Employee Summary Cards */}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

    {/* Total Employees */}
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">
            Total Employees
          </p>
          <h3 className="mt-2 text-2xl font-bold text-blue-900">
            {totalEmployees}
          </h3>
          <p className="mt-1 text-xs text-blue-600">
            All registered team members
          </p>
        </div>
        <div className="rounded-lg bg-blue-100 p-3">
          <Users size={23} className="text-blue-600" />
        </div>
      </div>
    </div>

    {/* Active Employees */}
    <div className="rounded-xl border border-green-100 bg-green-50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-green-700">
            Active Employees
          </p>
          <h3 className="mt-2 text-2xl font-bold text-green-900">
            {activeEmployees}
          </h3>
          <p className="mt-1 text-xs text-green-600">
            Currently active team members
          </p>
        </div>
        <div className="rounded-lg bg-green-100 p-3">
          <UserCheck size={23} className="text-green-600" />
        </div>
      </div>
    </div>

    {/* Departments */}
    <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-purple-700">
            Departments
          </p>
          <h3 className="mt-2 text-2xl font-bold text-purple-900">
            {totalDepartments}
          </h3>
          <p className="mt-1 text-xs text-purple-600">
            Departments with employees
          </p>
        </div>
        <div className="rounded-lg bg-purple-100 p-3">
          <Building2 size={23} className="text-purple-600" />
        </div>
      </div>
    </div>

  </div>

  {/* Employee Directory Toolbar */}
  <div className="flex flex-col gap-4">

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h4 className="text-sm font-bold text-gray-800">
          Employee Directory
        </h4>
        <p className="mt-1 text-xs text-gray-500">
          Search and manage your team members
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowAddEmployeeFormModal(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
      >
        <UserPlus size={16} />
        Add Employee
      </button>
    </div>

    {/* Search and Department Filter */}
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <input
        type="text"
        value={employeeSearch}
        onChange={(e) => setEmployeeSearch(e.target.value)}
        placeholder="Search by name, email, role or department..."
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
      />

      <select
        value={employeeDepartmentFilter}
        onChange={(e) => setEmployeeDepartmentFilter(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
      >
        <option value="All Departments">All Departments</option>
        {WORKSTREAM_OPTIONS.map((department) => (
          <option key={department} value={department}>
            {department}
          </option>
        ))}
      </select>
    </div>

  </div>
</div>

           

              {/* Configured Team Members */}
              {/* <div className="mt-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Configured Active Team Members ({employees.length})
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {employees.map((emp) => {
                    const assignedCount = tasks.filter(
                      (t) => (t.employee || "").toLowerCase() === emp.name.toLowerCase()
                    ).length;
                    return (
                      <div
                        key={emp.id}
                        className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-800 border border-purple-200">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{emp.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{emp.email}</p>
                          </div>
                        </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
  <span className="text-gray-500">{emp.role}</span>

  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
    {assignedCount} tasks
  </span>
</div>

<div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
  <button
    type="button"
    onClick={() => handleOpenEditEmployee(emp)}
    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
  >
    <Pencil className="h-3 w-3" />
    Edit
  </button>
</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )} */}

{/* Employee Directory Table */}

{/* Employee Directory Table */}
<div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
  <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
    <div>
      <h4 className="text-sm font-bold text-gray-800">
        Employee Directory
      </h4>
      <p className="mt-0.5 text-xs text-gray-500">
        {filteredEmployees.length} employee(s) found
      </p>
    </div>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full min-w-[1050px] text-left">
      <thead className="bg-gray-50">
        <tr className="border-b border-gray-200">
          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Employee
          </th>
          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Designation
          </th>
          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Department
          </th>
          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Assigned Tasks
          </th>
          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Status
          </th>
          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
            Actions
          </th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-100">
        {filteredEmployees.map((emp) => {
          const assignedCount = tasks.filter(
            (t) =>
              (t.employee || "").toLowerCase() === emp.name.toLowerCase()
          ).length;

          return (
            <tr key={emp.id} className="transition hover:bg-purple-50/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-200 bg-purple-100 text-sm font-bold text-purple-800">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {emp.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {emp.email || "No work email"}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3 text-sm text-gray-700">
                {emp.role || "â€”"}
              </td>

              <td className="px-4 py-3">
                <span className="inline-flex rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                  {emp.department || "â€”"}
                </span>
              </td>

              <td className="px-4 py-3">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {assignedCount} tasks
                </span>
              </td>

              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    emp.status === "Inactive"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  {emp.status || "Active"}
                </span>
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditEmployee(emp)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>

                  {emp.status === "Inactive" ? (
                    <button
                      type="button"
                      onClick={() => handleReactivateEmployee(emp)}
                      className="inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDeactivateEmployee(emp)}
                      className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}

        {filteredEmployees.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-gray-700">
                No employees found
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Try another search term or department.
              </p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>


<div className="mt-6 flex justify-end border-t pt-3">
  <button
    type="button"
    onClick={() => setShowEmployeeModal(false)}
    className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
  >
    Close
  </button>
</div>

        {/* ============================================================ */}
        
                  </div>
            </div>
          )}

        {/* ADD EMPLOYEE POPUP */}
        {showAddEmployeeFormModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Add Employee
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Create a new employee profile and assign a department.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddEmployeeFormModal(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  âœ•
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="mt-5 space-y-4">
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-purple-900">
                    Employee Details
                  </h4>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Employee Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                        placeholder="e.g. Rahul"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Designation / Role <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newEmpRole}
                        onChange={(e) => setNewEmpRole(e.target.value)}
                        placeholder="e.g. Site Engineer"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Work Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmpEmail}
                        onChange={(e) => setNewEmpEmail(e.target.value)}
                        placeholder="name@payaldecor.com"
                        className={inputClass}
                      />
                      <p className="mt-1 text-[11px] text-gray-500">
                        Contact email only. Login access is managed separately.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={newEmpPhone}
                        onChange={(e) => setNewEmpPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className={inputClass}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Department
                      </label>
                      <select
                        value={newEmpDept}
                        onChange={(e) => setNewEmpDept(e.target.value)}
                        className={inputClass}
                      >
                        {WORKSTREAM_OPTIONS.map((ws) => (
                          <option key={ws} value={ws}>
                            {ws}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddEmployeeFormModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-800"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ONE-TIME EMPLOYEE LOGIN CREDENTIALS */}
        {employeeCredentials && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Employee Created Successfully
                  </h3>
                  <p className="text-xs text-gray-500">
                    Login credentials generated
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-purple-800">
                  Temporary Login Credentials
                </p>

                <div className="mb-3">
                  <p className="text-xs text-gray-500">Employee</p>
                  <p className="font-semibold text-gray-900">
                    {employeeCredentials.name}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500">Login Email</p>
                  <p className="break-all font-medium text-gray-900">
                    {employeeCredentials.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Temporary Password</p>
                  <p className="mt-1 break-all rounded-lg border border-purple-200 bg-white p-3 font-mono text-sm font-bold text-purple-900">
                    {employeeCredentials.temporaryPassword}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-amber-700">
                Share these credentials securely with the employee.
                The employee must change this password on their first login.
                This temporary password will not be shown again after closing.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `Employee: ${employeeCredentials.name}\nEmail: ${employeeCredentials.email}\nTemporary Password: ${employeeCredentials.temporaryPassword}`
                    );
                  }}
                  className="rounded-lg border border-purple-300 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                >
                  Copy Credentials
                </button>

                <button
                  type="button"
                  onClick={() => setEmployeeCredentials(null)}
                  className="rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT EMPLOYEE MODAL */}
        {showEditEmployeeModal && editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Edit Employee
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Update employee details
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => {
                    setShowEditEmployeeModal(false);
                    setEditingEmployee(null);
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateEmployee} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEmpName}
                    onChange={(e) => setEditEmpName(e.target.value)}
                    className={inputClass}
                    placeholder="Enter employee name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editEmpRole}
                    onChange={(e) => setEditEmpRole(e.target.value)}
                    className={inputClass}
                    placeholder="Enter designation"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editEmpDept}
                    onChange={(e) => setEditEmpDept(e.target.value)}
                    className={inputClass}
                    placeholder="Enter department"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmpEmail}
                    onChange={(e) => setEditEmpEmail(e.target.value)}
                    className={inputClass}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editEmpPhone}
                    onChange={(e) => setEditEmpPhone(e.target.value)}
                    className={inputClass}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditEmployeeModal(false);
                      setEditingEmployee(null);
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-800"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CREATE / EDIT TASK MODAL                                    */}


        {/* ============================================================ */}
        {/* CREATE / EDIT TASK MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingId ? "Edit Task" : "Create New Task"}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the task details and assignment information.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close task form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTask} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Task ID
                    </label>
                    <input
                      type="text"
                      value={form.taskId}
                      onChange={(e) =>
                        setForm({ ...form, taskId: e.target.value })
                      }
                      className={inputClass}
                      placeholder="PD-001"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Workstream
                    </label>
                    <input
                      type="text"
                      value={form.workstream}
                      onChange={(e) =>
                        setForm({ ...form, workstream: e.target.value })
                      }
                      className={inputClass}
                      placeholder="Enter workstream"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Task / Activity *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={form.taskActivity}
                    onChange={(e) =>
                      setForm({ ...form, taskActivity: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Describe the task or activity"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Priority
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          priority: e.target.value as PriorityLevel,
                        })
                      }
                      className={inputClass}
                    >
                      {(["Critical", "Urgent", "High", "Medium", "Low"] as PriorityLevel[]).map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Assigned Employee *
                    </label>
                    {currentSession.isAdmin ? (
                      <select
                        value={form.employee}
                        onChange={(e) =>
                          setForm({ ...form, employee: e.target.value })
                        }
                        className={inputClass}
                        required
                      >
                        {!employees.some((emp) => emp.name === form.employee && emp.status === "Active") && (
                          <option value={form.employee}>{form.employee}</option>
                        )}
                        {employees
                          .filter((emp) => emp.status === "Active")
                          .map((emp) => (
                            <option key={emp.id} value={emp.name}>
                              {emp.name} ({emp.role})
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={currentSession.name}
                        readOnly
                        className={`${inputClass} bg-gray-100`}
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Primary Responsible Person *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.primaryResponsible}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          primaryResponsible: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="Enter responsible person"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Supporting Role
                    </label>
                    <input
                      type="text"
                      value={form.supportingRole}
                      onChange={(e) =>
                        setForm({ ...form, supportingRole: e.target.value })
                      }
                      className={inputClass}
                      placeholder="Enter supporting role"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={form.targetDate}
                      onChange={(e) =>
                        setForm({ ...form, targetDate: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value as TaskStatus,
                        })
                      }
                      className={inputClass}
                    >
                      {(["Not Started", "In Progress", "Completed", "On Hold", "Blocked", "Pending", "Under Review"] as TaskStatus[]).map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Expected Deliverable
                  </label>
                  <textarea
                    rows={2}
                    value={form.expectedDeliverable}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        expectedDeliverable: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Describe the expected output"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={form.remarks}
                    onChange={(e) =>
                      setForm({ ...form, remarks: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Additional remarks or instructions"
                  />
                </div>

                {feedbackMsg?.type === "error" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {feedbackMsg.text}
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-purple-700 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update Task"
                        : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* VIEW TASK DETAILS MODAL                                      */}
        {/* ============================================================ */}
        {viewingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-in fade-in">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold bg-slate-100 text-slate-800 border px-2.5 py-1 rounded-md">
                    {viewingTask.taskId}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Task Execution Details
                    </h3>
                    <p className="text-xs text-gray-500">
                      Workstream: {viewingTask.workstream}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close task details"
                  onClick={() => setViewingTask(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Task / Activity
                  </h4>
                  <p className="mt-1 font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border">
                    {viewingTask.taskActivity}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-gray-500">Priority</span>
                    <div className="mt-1">{getPriorityBadge(viewingTask.priority)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-gray-500">Status</span>
                    <div className="mt-1">{getStatusBadge(viewingTask.status)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                    <span className="text-xs font-semibold text-purple-900">Assigned Employee</span>
                    <p className="mt-1 font-bold text-purple-950 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-purple-700" />
                      {viewingTask.employee}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-gray-500">Primary Responsible Person</span>
                    <p className="mt-1 font-semibold text-gray-900">
                      {viewingTask.primaryResponsible}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-gray-500">Supporting Role</span>
                    <p className="mt-1 text-gray-800">
                      {viewingTask.supportingRole || "â€”"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-gray-500">Target Date</span>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatDateDisplay(viewingTask.targetDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-gray-500">Expected Deliverable</span>
                    <p className="mt-1 text-gray-800">
                      {viewingTask.expectedDeliverable || "â€”"}
                    </p>
                  </div>
                </div>

                {viewingTask.remarks && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <span className="text-xs font-semibold text-amber-900">
                      Remarks / Blockers
                    </span>
                    <p className="mt-1 text-amber-800 text-xs leading-relaxed">
                      {viewingTask.remarks}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border p-3">
                  <span className="text-xs text-gray-500">Others</span>
                  <p className="mt-1 text-gray-400 text-xs italic">
                    {viewingTask.others || "â€” (Blank)"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const t = viewingTask;
                    setViewingTask(null);
                    handleOpenEdit(t);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Task
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTask(null)}
                  className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default OperationsPage;
