import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";

export default function AuthPage() {
  const navigate = useNavigate();
  const { firebaseSync } = useAuth();
  const [mode, setMode] = useState("login"); // login, register
  const [method, setMethod] = useState("email"); // email, phone
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    otp: "",
  });

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    // Setup invisible recaptcha for phone auth
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
          // reCAPTCHA solved
        }
      });
    }
  }, []);

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (mode === "register") {
        // Create user in Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
        
        // Send email verification
        await sendEmailVerification(userCredential.user);
        toast.success("Registration successful! Verification email sent.");
        
        // Sync with backend to save in MongoDB
        const token = await userCredential.user.getIdToken();
        const success = await firebaseSync(token, {
          name: form.name,
          email: form.email,
          phone: form.phone,
        });

        if (success) navigate("/dashboard");
      } else {
        // Login with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
        
        if (!userCredential.user.emailVerified) {
          toast.info("Please verify your email address. We sent a link during registration.");
        }

        // Sync with backend
        const token = await userCredential.user.getIdToken();
        const success = await firebaseSync(token);
        
        if (success) navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to authenticate with Email");
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (!form.phone || form.phone.length < 10) {
      return toast.error("Please enter a valid phone number with country code (e.g. +91...)");
    }
    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, form.phone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      toast.success("OTP sent to your phone!");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!form.otp || form.otp.length < 6) return toast.error("Please enter the 6-digit OTP");
    
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(form.otp);
      
      // Sync with backend
      const token = await result.user.getIdToken();
      // Only pass name/email if registering (though for phone, we might not have email depending on flow)
      const success = await firebaseSync(token, {
        name: mode === "register" ? form.name : undefined,
        email: mode === "register" ? form.email : undefined,
        phone: form.phone
      });

      if (success) navigate("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Invalid OTP or verification failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (method === "email") {
      await handleEmailAuth();
    } else {
      if (otpSent) {
        await verifyPhoneOtp();
      } else {
        await sendPhoneOtp();
      }
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
          {/* Main Mode Toggle: Login / Register */}
          <div className="mb-6 flex items-center gap-2 rounded-full bg-accent p-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setOtpSent(false); }}
              className={`w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "login" ? "bg-primary text-white" : "text-zinc-700"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setOtpSent(false); }}
              className={`w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "register" ? "bg-primary text-white" : "text-zinc-700"
              }`}
            >
              Create account
            </button>
          </div>

          {/* Secondary Toggle: Email / Phone */}
          <div className="mb-6 flex items-center gap-4 text-sm font-medium">
            <button
              type="button"
              onClick={() => { setMethod("email"); setOtpSent(false); }}
              className={`pb-1 ${method === "email" ? "border-b-2 border-primary text-primary" : "text-zinc-500"}`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setMethod("phone"); setOtpSent(false); }}
              className={`pb-1 ${method === "phone" ? "border-b-2 border-primary text-primary" : "text-zinc-500"}`}
            >
              Phone OTP
            </button>
          </div>

          {/* reCAPTCHA container for Firebase Phone Auth */}
          <div id="recaptcha-container"></div>

          {/* ----- COMMON REGISTRATION FIELDS ----- */}
          {mode === "register" && !otpSent && (
            <div className="mb-4 space-y-4">
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
              {/* If registering via Phone, we still might want their email for standard records */}
              {method === "phone" && (
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
              )}
              {/* If registering via Email, we still want phone for standard records */}
              {method === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => onChange("phone", e.target.value)}
                    placeholder="e.g. +919876543210"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* ----- EMAIL FLOW ----- */}
          {method === "email" && (
            <>
              <div className="mb-4 space-y-2">
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
              <div className="mb-6 space-y-2">
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
            </>
          )}

          {/* ----- PHONE FLOW ----- */}
          {method === "phone" && (
            <>
              {!otpSent ? (
                <div className="mb-6 space-y-2">
                  <Label htmlFor="phone">Phone Number (with Country Code)</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => onChange("phone", e.target.value)}
                    placeholder="+919876543210"
                    required
                  />
                  <p className="text-xs text-zinc-500">Must include country code like +91</p>
                </div>
              ) : (
                <div className="mb-6 space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    value={form.otp}
                    onChange={(e) => onChange("otp", e.target.value)}
                    placeholder="123456"
                    required
                  />
                </div>
              )}
            </>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-full text-base font-bold"
            disabled={loading}
          >
            {loading 
              ? "Please wait..." 
              : method === "phone" && !otpSent 
                ? "Send OTP" 
                : mode === "login" 
                  ? "Sign in" 
                  : "Create account"}
          </Button>
        </motion.form>
      </div>
    </section>
  );
}
