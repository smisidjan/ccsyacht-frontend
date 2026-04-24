"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTenant } from "@/app/context/TenantContext";
import { setAuthToken, getAuthToken, setOnUnauthorized } from "@/lib/api/client";
import { useSessionKeepAlive } from "@/lib/hooks/useSessionKeepAlive";
import { useToast } from "@/app/context/ToastContext";
import { useTranslations } from "next-intl";

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/dashboard/system/forgot-password",
  "/dashboard/system/reset-password",
  "/invitation/accept",
  "/invitation/decline"
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { clearTenant } = useTenant();

  useEffect(() => {
    const storedToken = getAuthToken();
    setToken(storedToken);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
      || pathname.startsWith("/register/")
      || pathname.startsWith("/dashboard/system/");

    const isSystemRoute = pathname.startsWith("/dashboard/system/");

    if (!token && !isPublicRoute) {
      router.push("/login");
    }

    // Don't redirect if on system routes - they use separate authentication
    if (token && isPublicRoute && !isSystemRoute) {
      router.push("/dashboard");
    }
  }, [token, isLoading, pathname, router]);

  const login = (newToken: string) => {
    setAuthToken(newToken);
    setToken(newToken);
    router.push("/dashboard");
  };

  const { showToast } = useToast();
  const t = useTranslations("auth.errors");

  const logout = useCallback((showSessionExpired = false) => {
    setAuthToken(null);
    clearTenant();
    setToken(null);
    if (showSessionExpired) {
      // Store flag in sessionStorage to show toast after redirect
      sessionStorage.setItem("sessionExpired", "true");
    }
    router.push("/login");
  }, [clearTenant, router]);

  // Handle 401 responses - token expired
  useEffect(() => {
    setOnUnauthorized(() => {
      logout(true);
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, [logout]);

  // Show session expired toast on login page if redirected
  useEffect(() => {
    if (pathname === "/login" && sessionStorage.getItem("sessionExpired")) {
      sessionStorage.removeItem("sessionExpired");
      showToast("warning", t("sessionExpired"));
    }
  }, [pathname, showToast]);

  // Keep session alive for active users
  useSessionKeepAlive({
    enabled: !!token,
    onPingError: () => logout(true),
  });

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
