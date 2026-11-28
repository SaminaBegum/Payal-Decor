import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, LogIn } from "lucide-react";
import { loginWithCredentials, type UserRole } from "@/lib/auth";

// Where each role lands after login. The role comes from the server response,
// never from anything the user picks on this page.
const ROLE_HOME: Record<UserRole, string> = {
  Admin: "/",
  Manager: "/", // change when a manager dashboard route exists
  Employee: "/employee-dashboard",
};

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your registered email and password.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await loginWithCredentials(email.trim(), password);

      if (!result.success || !result.user) {
        setError(result.error || "Invalid email or password.");
        return;
      }

      // Redirect using the role verified by the server.
      const destination = ROLE_HOME[result.user.role] ?? "/";
      navigate(destination, { replace: true });
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
            Sign in to access your workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
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
              autoFocus
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                <LogIn size={16} />
                Sign in
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