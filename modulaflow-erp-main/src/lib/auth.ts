
export type UserRole = "Admin" | "Manager" | "Employee";
export interface EmployeeProfile {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  designation: string;
  department: string;
  status: string;
}
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  employeeProfile?: EmployeeProfile | null;
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
    // Keep default profiles if local storage cannot be read.
  }

  return INITIAL_EMPLOYEE_ACCOUNTS;
}

function saveSession(user: AuthUser, token: string) {
  sessionStorage.setItem(AUTH_KEY, "true");
  sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(TOKEN_KEY, token);
}

export async function loginWithRole(
  email: string,
  password: string,
  selectedRole?: UserRole
): Promise<LoginResult> {
  if (!email.trim() || !password) {
    return {
      success: false,
      error: "Please enter your registered email and password.",
    };
  }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || "Email or password is incorrect.",
      };
    }

    if (!data.token || !data.user) {
      return {
        success: false,
        error: "The server returned an incomplete login response.",
      };
    }

    const actualRole = String(data.user.role || "").trim();

    if (
      actualRole !== "Admin" &&
      actualRole !== "Manager" &&
      actualRole !== "Employee"
    ) {
      return {
        success: false,
        error: "Your account has an unsupported role.",
      };
    }

    if (selectedRole && actualRole !== selectedRole) {
      return {
        success: false,
        error: `This account is registered as ${actualRole}. Please select ${actualRole} to sign in.`,
      };
    }

     let employeeProfile: EmployeeProfile | null = null;

    if (actualRole === "Employee") {
      try {
        const profileResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        });

        const profileData = await profileResponse.json();

        if (profileResponse.ok && profileData.success) {
          employeeProfile = profileData.user?.employeeProfile || null;
        }
      } catch (error) {
        console.error("Unable to load employee profile:", error);
      }
    }

    const user: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: actualRole,
      department: data.user.department,
      isAdmin: actualRole === "Admin",
      mustChangePassword: data.user.mustChangePassword === true,
      employeeProfile,
      
    };



    saveSession(user, data.token);

    return { success: true, user };
  } catch {
    return {
      success: false,
      error:
        "Cannot connect to the server. Please check that the backend is running.",
    };
  }
}
export function loginWithCredentials(
  email: string,
  password: string
): Promise<LoginResult> {
  return loginWithRole(email, password);
}
// Compatibility wrapper for the existing Admin login flow.
export async function loginAdmin(
  id: string,
  password: string
): Promise<LoginResult> {
  const email =
    id.trim().toLowerCase() === "admin"
      ? "payaldecor@gmail.com"
      : id.trim().toLowerCase();

  return loginWithRole(email, password, "Admin");
}

// Employee authentication now uses the registered email, not a local profile ID.
export async function loginEmployee(
  email: string,
  password: string
): Promise<LoginResult> {
  return loginWithRole(email, password, "Employee");
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
export function updateCurrentUser(
  updates: Partial<AuthUser>
): AuthUser | null {
  const currentUser = getCurrentUser();

  if (!currentUser) return null;

  const updatedUser = {
    ...currentUser,
    ...updates,
  };

  sessionStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify(updatedUser)
  );

  return updatedUser;
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
