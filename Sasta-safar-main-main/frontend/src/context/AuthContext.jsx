import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("sasta_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistAuth = (newToken, newUser) => {
    localStorage.setItem("sasta_token", newToken);
    localStorage.setItem("sasta_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const clearAuth = () => {
    localStorage.removeItem("sasta_token");
    localStorage.removeItem("sasta_user");
    setToken(null);
    setUser(null);
  };

  const firebaseSync = async (firebase_token, userData = {}) => {
    try {
      const response = await api.post("/auth/firebase-sync", {
        firebase_token,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
      });
      persistAuth(response.data.token, response.data.user);
      toast.success("Welcome!");
      return true;
    } catch (error) {
      console.error("Firebase sync error:", error);
      toast.error(error.response?.data?.detail || "Authentication failed");
      return false;
    }
  };

  const logout = () => {
    clearAuth();
    toast.success("Logged out");
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const value = useMemo(
    () => ({ user, token, loading, firebaseSync, logout }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
