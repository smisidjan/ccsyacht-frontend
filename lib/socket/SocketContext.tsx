"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useTenant } from "@/app/context/TenantContext";
import { useAuth } from "@/app/context/AuthContext";
import { handleError } from "@/lib/utils/errors";

// Type definitions
interface EchoInstance {
  private(channel: string): any;
  leave(channel: string): void;
  disconnect(): void;
  connector: {
    pusher: {
      connection: {
        bind(event: string, callback: (data?: any) => void): void;
        unbind(event: string, callback?: (data?: any) => void): void;
        state: string;
      };
    };
  };
}

interface SocketContextType {
  echo: EchoInstance | null;
  connected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  echo: null,
  connected: false,
  reconnect: () => {},
});

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [echo, setEcho] = useState<EchoInstance | null>(null);
  const [connected, setConnected] = useState(false);
  const { tenantId, isLoaded: tenantLoaded } = useTenant();
  const { token, isLoading: authLoading } = useAuth();

  // Keep track of previous token to detect logout
  const prevTokenRef = useRef<string | null>(null);

  // Disconnect function - safely disconnects and cleans up
  const disconnect = useCallback(() => {
    if (echo) {
      try {
        echo.disconnect();
      } catch {
        // Ignore errors during disconnect
      }
      setEcho(null);
      setConnected(false);
      // Remove from window
      if (typeof window !== "undefined") {
        delete (window as any).Echo;
      }
    }
  }, [echo]);

  const initializeEcho = useCallback(async () => {
    // Alleen initialiseren in browser
    if (typeof window === "undefined") return;

    // Wait for tenant and auth to be available
    if (!tenantLoaded || authLoading) {
      return;
    }

    // Check for valid tenant and token (not empty, not "undefined" string)
    if (!tenantId || !token || tenantId === "undefined" || token === "undefined") {
      return;
    }

    try {
      // Dynamic imports voor browser-only modules
      const Pusher = (await import("pusher-js")).default;
      const LaravelEcho = (await import("laravel-echo")).default;

      // Maak Pusher globaal beschikbaar voor Laravel Echo
      (window as any).Pusher = Pusher;

      // Construct full auth URL from browser location
      const authEndpoint = process.env.NEXT_PUBLIC_API_URL?.startsWith('http')
        ? `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`
        : `${window.location.origin}${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`;

      const echoInstance = new LaravelEcho({
        broadcaster: "reverb",
        key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
        wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
        wsPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || "8080"),
        wssPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || "8080"),
        forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
        enabledTransports: ["ws", "wss"],
        // Auth voor private channels
        authEndpoint,
        auth: {
          headers: {
            "X-Tenant-ID": tenantId || "",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      }) as EchoInstance;

      // Connection events
      echoInstance.connector.pusher.connection.bind("connected", () => {
        setConnected(true);
      });

      echoInstance.connector.pusher.connection.bind("disconnected", () => {
        setConnected(false);
      });

      // Handle WebSocket errors
      echoInstance.connector.pusher.connection.bind("error", (err: any) => {
        // Only log non-empty errors to avoid noise from empty {} errors
        if (err && Object.keys(err).length > 0) {
          console.error("WebSocket error:", err);
        }

        // Check for auth errors (token expired/invalid)
        // These can come in various formats depending on the WebSocket server
        const isAuthError =
          err?.error?.data?.code === 401 ||
          err?.type === "AuthError" ||
          err?.error?.code === 4001 || // Custom auth error code
          (err?.error?.message && err.error.message.toLowerCase().includes("unauthorized"));

        if (isAuthError) {
          console.warn("WebSocket authentication failed - disconnecting");
          try {
            echoInstance.disconnect();
          } catch {
            // Ignore
          }
          setEcho(null);
          setConnected(false);
          if (typeof window !== "undefined") {
            delete (window as any).Echo;
          }
        }
      });

      // Handle connection failures
      echoInstance.connector.pusher.connection.bind("failed", () => {
        console.error("WebSocket connection failed");
        setConnected(false);
      });

      // Make Echo available on window so API client can access socket ID
      (window as any).Echo = echoInstance;

      setEcho(echoInstance);
    } catch (error) {
      handleError(error, { severity: "console", context: "Failed to initialize Laravel Echo" });
    }
  }, [tenantLoaded, authLoading, tenantId, token]);

  const reconnect = useCallback(() => {
    disconnect();
    // Small delay to ensure cleanup before reconnecting
    setTimeout(() => {
      initializeEcho();
    }, 100);
  }, [disconnect, initializeEcho]);

  // Effect 1: Watch for logout (token becoming null/undefined after being valid)
  useEffect(() => {
    const hadValidToken = prevTokenRef.current && prevTokenRef.current !== "undefined";
    const hasValidToken = token && token !== "undefined";

    // Detect logout: had a valid token before, but no valid token now
    if (hadValidToken && !hasValidToken) {
      console.log("User logged out - disconnecting WebSocket");
      disconnect();
    }

    // Update ref for next comparison
    prevTokenRef.current = token;
  }, [token, disconnect]);

  // Effect 2: Initialize WebSocket when auth is ready
  useEffect(() => {
    // Only initialize if not already connected and all requirements are met
    const hasValidToken = token && token !== "undefined";
    const hasValidTenant = tenantId && tenantId !== "undefined";

    if (!echo && tenantLoaded && !authLoading && hasValidTenant && hasValidToken) {
      initializeEcho();
    }

    // Cleanup on unmount
    return () => {
      if (echo) {
        try {
          echo.disconnect();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [echo, tenantLoaded, authLoading, tenantId, token, initializeEcho]);

  return (
    <SocketContext.Provider value={{ echo, connected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};
