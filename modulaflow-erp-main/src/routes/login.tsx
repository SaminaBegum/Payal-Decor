
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  BriefcaseBusiness,
} from "lucide-react";
import {
  loginWithRole,
  type UserRole,
} from "@/lib/auth";

function LoginPage() {
  const navigate = useNavigate();

  const [loginRole, setLoginRole] = useState<UserRole>("Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles: {
    value: UserRole;
    title: string;
    description: string;
    icon: typeof ShieldCheck;
  }[] = [
    {
      value: "Admin",
      title: "Admin",
      description: "Full system access",
      icon: ShieldCheck,
    },
    {
      value: "Manager",
      title: "Manager",
      description: "Department and team access",
      icon: BriefcaseBusiness,
    },
    {
      value: "Employee",
      title: "Employee",
      description: "Assigned tasks and workspace",
      icon: UserCheck,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your registered email and password.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await loginWithRole(
        email.trim(),
        password,
        loginRole
      );

      if (!result.success) {
        setError(result.error || "Login failed. Please try again.");
        return;
      }

     // Redirect users according to their authenticated role.
if (loginRole === "Employee") {
  navigate("/employee-dashboard", { replace: true });
} else {
  navigate("/", { replace: true });
}
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F4] px-4 py-10">
      <div className="w-full max-w-[460px] rounded-2xl border border-[#EADFD5] bg-white p-8 shadow-[0_10px_40px_rgba(60,35,10,0.08)] sm:p-10">
        <div className="mb-6 flex justify-center">
          <img
            src="/logo.png"
            alt="Payal Decor"
            className="h-20 w-auto object-contain"
          />
        </div>

        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-semibold text-[#1F1710]">
            Sign in to ERP
          </h1>
          <p className="mt-1 text-sm text-[#7A6A5C]">
            Select your role to access your workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {/* Role selection */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#1F1710]">
              Sign In As <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {roles.map((role) => {
                const Icon = role.icon;
                const selected = loginRole === role.value;

                return (
                  <button
                    key={role.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setLoginRole(role.value);
                      setError("");
                      setPassword("");
                    }}
                    className={`flex min-h-[108px] flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                      selected
                        ? "border-[#B05A00] bg-[#FFF5EA] text-[#954C00] ring-2 ring-[#B05A00]/20"
                        : "border-[#E3D6CA] bg-white text-[#7A6A5C] hover:border-[#B05A00]/50 hover:bg-[#FAF7F4]"
                    }`}
                  >
                    <Icon size={22} className="mb-2" />

                    <span className="text-xs font-bold">
                      {role.title}
                    </span>

                    <span className="mt-1 text-[10px] leading-tight">
                      {role.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Registered email */}
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-semibold text-[#1F1710]"
            >
              Registered Email <span className="text-red-500">*</span>
            </label>

            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              className="h-11 w-full rounded-lg border border-[#E3D6CA] bg-white px-3 text-sm text-[#1F1710] outline-none transition placeholder:text-[#B5A698] focus:border-[#B05A00] focus:ring-2 focus:ring-[#B05A00]/20"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-semibold text-[#1F1710]"
            >
              Password <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-11 w-full rounded-lg border border-[#E3D6CA] bg-white px-3 pr-11 text-sm text-[#1F1710] outline-none transition placeholder:text-[#B5A698] focus:border-[#B05A00] focus:ring-2 focus:ring-[#B05A00]/20"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-[#7A6A5C] hover:text-[#1F1710]"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#B05A00] text-sm font-semibold text-white shadow-xs transition hover:bg-[#954C00] focus:outline-none focus:ring-2 focus:ring-[#B05A00]/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              "Signing in..."
            ) : (
              <>
                <ShieldCheck size={16} />
                Sign in as {loginRole}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-[#EADFD5] pt-4 text-center">
          <p className="text-[11px] text-[#7A6A5C]">
            Your account permissions are verified securely by the server.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

