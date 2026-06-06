import { useState } from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const LoginPage = () => {
  const { user, login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Already logged in — go straight to dashboard
  if (user) {
    return <Navigate to="/ims/dashboard" replace />;
  }

  const handleSubmit = async () => {
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }
    if (isSignup && !form.fullName) {
      setError("Full name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignup) {
        await signup({ fullName: form.fullName, email: form.email, password: form.password });
        // signup sets user in context → Navigate above will redirect to dashboard on re-render
      } else {
        await login({ email: form.email, password: form.password });
        // Use saved redirect path, or fall back to dashboard
        const redirectPath = sessionStorage.getItem("ims_redirectPath") || "/ims/dashboard";
        sessionStorage.removeItem("ims_redirectPath");
        window.location.href = redirectPath;
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 via-white to-teal-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Retail IMS</h1>
        <p className="mt-1 text-sm text-slate-600">
          {isSignup ? "Create a new account" : "Login to continue"}
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {isSignup && (
            <input
              className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              onKeyDown={handleKeyDown}
              autoComplete="name"
            />
          )}

          <input
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            onKeyDown={handleKeyDown}
            autoComplete="email"
          />

          <input
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            onKeyDown={handleKeyDown}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Please wait..." : isSignup ? "Create account" : "Login"}
          </button>
        </div>

        <button
          type="button"
          className="mt-4 text-sm text-brand-600 hover:text-brand-700 hover:underline"
          onClick={() => {
            setIsSignup((prev) => !prev);
            setError("");
            setForm({ fullName: "", email: "", password: "" });
          }}
        >
          {isSignup ? "Already have an account? Login" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;