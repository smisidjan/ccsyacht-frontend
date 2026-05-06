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
  const t = useTranslations("auth");

  const logout = useCallback((reason: "user" | "expired" = "user") => {
    // User-initiated logout wins over a later "expired" signal (e.g. an in-flight
    // 401 or keep-alive ping that fires after the token was just cleared).
    const existing = sessionStorage.getItem("logoutReason");
    if (!existing || reason === "user") {
      sessionStorage.setItem("logoutReason", reason);
    }
    setAuthToken(null);
    clearTenant();
    setToken(null);
    router.push("/login");
  }, [clearTenant, router]);

  // Handle 401 responses - token expired
  useEffect(() => {
    setOnUnauthorized(() => {
      logout("expired");
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, [logout]);

  // Show post-logout toast on login page if redirected
  useEffect(() => {
    if (pathname !== "/login") return;
    const reason = sessionStorage.getItem("logoutReason");
    if (!reason) return;
    sessionStorage.removeItem("logoutReason");
    if (reason === "expired") {
      showToast("warning", t("errors.sessionExpired"));
    } else {
      showToast("success", t("loggedOut"));
    }
  }, [pathname, showToast, t]);

  // Keep session alive for active users
  useSessionKeepAlive({
    enabled: !!token,
    onPingError: () => logout("expired"),
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
