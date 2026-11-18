

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

export interface EmployeeAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const AUTH_KEY = "payal_decor_admin_auth";
const CURRENT_USER_KEY = "payal_decor_current_user";
const TOKEN_KEY = "payal_decor_auth_token";
const EMPLOYEES_STORAGE_KEY = "payal_decor_employees_v4";

export const INITIAL_EMPLOYEE_ACCOUNTS: EmployeeAccount[] = [
  {
    id: "gaurav",
    name: "Gaurav",
    email: "gaurav@payaldecor.com",
    role: "Project Manager",
    department: "Operations & Project Control",
  },
  {
    id: "disha",
    name: "Disha",
    email: "disha@payaldecor.com",
    role: "Software Developer",
    department: "Software & Operations",
  },
  {
    id: "sairaj",
    name: "Sairaj",
    email: "sairaj@payaldecor.com",
    role: "Operations & Production",
    department: "Production & Site",
  },
  {
    id: "saniya",
    name: "Saniya",
    email: "saniya@payaldecor.com",
    role: "Design & Documentation",
    department: "Design & CAD",
  },
];

export function getEmployeeAccounts(): EmployeeAccount[] {
  if (typeof window === "undefined") {
    return INITIAL_EMPLOYEE_ACCOUNTS;
  }

  try {
    const stored = localStorage.getItem(EMPLOYEES_STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        const baseNames = new Set(
          INITIAL_EMPLOYEE_ACCOUNTS.map((employee) =>
            employee.name.toLowerCase()
          )
        );

        const custom: EmployeeAccount[] = parsed
          .filter(
            (item) =>
              item &&
              item.name &&
              !baseNames.has(item.name.toLowerCase())
          )
          .map((item) => ({
            id: item.id || item.name.toLowerCase(),
            name: item.name,
            email:
              item.email ||
              `${item.name.toLowerCase()}@payaldecor.com`,
            role: item.role || "Employee",
            department: item.department || "General",
          }));

        return [...INITIAL_EMPLOYEE_ACCOUNTS, ...custom];
      }
    }
  } catch {
    // Keep the default employee roster if stored data cannot be read.
  }

  return INITIAL_EMPLOYEE_ACCOUNTS;
}

function saveSession(user: AuthUser, token: string) {
  sessionStorage.setItem(AUTH_KEY, "true");
  sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(TOKEN_KEY, token);
}

export async function loginAdmin(
  id: string,
  password: string
): Promise<LoginResult> {
  if (!id.trim() || !password) {
    return {
      success: false,
      error: "Please enter your Admin ID and password.",
    };
  }

  // Preserve the existing Admin ID field in the login screen.
  const email =
    id.trim().toLowerCase() === "admin"
      ? "payaldecor@gmail.com"
      : id.trim().toLowerCase();

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || "Admin login failed.",
      };
    }

    if (!data.token || !data.user) {
      return {
        success: false,
        error: "The server returned an incomplete login response.",
      };
    }

    const user: AuthUser = {
      id: data.user.id,
      name:
        data.user.role?.toLowerCase() === "admin"
          ? "Admin"
          : data.user.name,
      email: data.user.email,
      role:
        data.user.role?.toLowerCase() === "admin"
          ? "System Administrator"
          : data.user.role,
      department: data.user.department,
      isAdmin: data.user.role?.toLowerCase() === "admin",
    };

    saveSession(user, data.token);

    return { success: true, user };
  } catch {
    return {
      success: false,
      error: "Cannot connect to the server. Please check that the backend is running.",
    };
  }
}


export async function loginEmployee(
  employeeEmail: string,
  password: string
): Promise<LoginResult> {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: employeeEmail.trim(),
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.token || !data.user) {
      return {
        success: false,
        error: data.message || "Invalid employee email or password.",
      };
    }

    if (data.user.role !== "Employee") {
      return {
        success: false,
        error: "This login is for employee accounts only.",
      };
    }

    const user: AuthUser = {
      id: data.user.id,
      name: data.user.full_name || data.user.name || "",
      email: data.user.email,
      role: data.user.role,
      department: data.user.department || "",
      isAdmin: false,
      mustChangePassword: Boolean(data.user.must_change_password),
    };

    saveSession(user, data.token);

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("Employee login error:", error);

    return {
      success: false,
      error: "Cannot connect to the server. Please check that the backend is running.",
    };
  }
}


export function login(
  id: string,
  password: string,
  loginType: "admin" | "employee" = "admin"
): Promise<boolean> {
  if (loginType === "admin") {
    return loginAdmin(id, password).then((result) => result.success);
  }

  return loginEmployee(id, password).then((result) => result.success);
}

export function logout() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(CURRENT_USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;

  return Boolean(
    sessionStorage.getItem(TOKEN_KEY) &&
    sessionStorage.getItem(AUTH_KEY) === "true" &&
    getCurrentUser()
  );
}
