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
  const [mode, setMode] = useState("login"); // login, register
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const success = await login(form.email, form.password);
        if (success) navigate("/dashboard");
      } else {
        const success = await register(form);
        if (success) navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid items-stretch gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-border bg-accent/50 p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
            Secure account required
          </p>
          <h1 className="font-heading mt-4 text-4xl font-bold leading-tight text-zinc-900">
            One account. Post rides and book rides.
          </h1>
          <p className="mt-4 text-sm text-zinc-700">
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
        >
          <div className="mb-8 flex items-center gap-2 rounded-full bg-accent p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "login" ? "bg-primary text-white" : "text-zinc-700 hover:bg-zinc-200/50"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "register" ? "bg-primary text-white" : "text-zinc-700 hover:bg-zinc-200/50"
              }`}
            >
              Create account
            </button>
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => onChange("phone", e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => onChange("password", e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="mt-8 h-12 w-full rounded-full text-base font-bold"
            disabled={loading}
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </motion.form>
      </div>
    </section>
  );
}
