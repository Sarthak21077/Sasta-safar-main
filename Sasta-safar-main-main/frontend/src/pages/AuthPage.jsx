import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    const success =
      mode === "login"
        ? await login(form.email, form.password)
        : await register({
            name: form.name,
            phone: form.phone,
            email: form.email,
            password: form.password,
          });

    setLoading(false);
    if (success) {
      navigate("/dashboard");
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="auth-page">
      <div className="grid items-stretch gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-border bg-accent/50 p-8" data-testid="auth-side-info">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-600" data-testid="auth-side-label">
            Secure account required
          </p>
          <h1
            className="font-heading mt-4 text-4xl font-bold leading-tight text-zinc-900"
            data-testid="auth-side-heading"
          >
            One account. Post rides and book rides.
          </h1>
          <p className="mt-4 text-sm text-zinc-700" data-testid="auth-side-description">
            Drivers can post route, seats and price. Riders can search, offer lower fare, and pay via
            Stripe after approval.
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          onSubmit={onSubmit}
          className="rounded-3xl border border-border bg-card p-8 shadow-sm"
          data-testid="auth-form"
        >
          <div className="mb-6 flex items-center gap-2 rounded-full bg-accent p-1" data-testid="auth-mode-switch">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "login" ? "bg-primary text-white" : "text-zinc-700"
              }`}
              data-testid="auth-mode-login-button"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "register" ? "bg-primary text-white" : "text-zinc-700"
              }`}
              data-testid="auth-mode-register-button"
            >
              Create account
            </button>
          </div>

          {mode === "register" && (
            <div className="mb-4 space-y-2" data-testid="auth-name-field-wrap">
              <Label htmlFor="name" data-testid="auth-name-label">
                Full Name
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Enter your full name"
                required
                data-testid="auth-name-input"
              />
            </div>
          )}

          {mode === "register" && (
            <div className="mb-4 space-y-2" data-testid="auth-phone-field-wrap">
              <Label htmlFor="phone" data-testid="auth-phone-label">
                Mobile Number
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) => onChange("phone", event.target.value)}
                placeholder="Enter mobile number"
                required
                data-testid="auth-phone-input"
              />
            </div>
          )}

          <div className="mb-4 space-y-2" data-testid="auth-email-field-wrap">
            <Label htmlFor="email" data-testid="auth-email-label">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="you@example.com"
              required
              data-testid="auth-email-input"
            />
          </div>

          <div className="mb-6 space-y-2" data-testid="auth-password-field-wrap">
            <Label htmlFor="password" data-testid="auth-password-label">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
              data-testid="auth-password-input"
            />
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-full text-base font-bold"
            disabled={loading}
            data-testid="auth-submit-button"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </motion.form>
      </div>
    </section>
  );
}
