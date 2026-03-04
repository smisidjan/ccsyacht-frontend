"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useTenant } from "@/app/context/TenantContext";
import { useAuth } from "@/app/context/AuthContext";

// Type definitions
interface EchoInstance {
  private(channel: string): any;
  leave(channel: string): void;
  disconnect(): void;
  connector: {
    pusher: {
      connection: {
        bind(event: string, callback: (data?: any) => void): void;
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

      echoInstance.connector.pusher.connection.bind("error", (err: any) => {
        console.error("WebSocket error:", err);
      });

      // Log authentication errors
      echoInstance.connector.pusher.connection.bind("failed", () => {
        console.error("❌ WebSocket connection failed");
      });

      // Make Echo available on window so API client can access socket ID
      (window as any).Echo = echoInstance;

      setEcho(echoInstance);
    } catch (error) {
      console.error("Failed to initialize Laravel Echo:", error);
    }
  }, [tenantLoaded, authLoading, tenantId, token]);

  const reconnect = useCallback(() => {
    if (echo) {
      echo.disconnect();
    }
    initializeEcho();
  }, [echo, initializeEcho]);

  useEffect(() => {
    // Only initialize if not already connected and contexts are ready
    if (!echo && tenantLoaded && !authLoading && tenantId && token) {
      initializeEcho();
    }

    // Cleanup bij unmount
    return () => {
      if (echo) {
        echo.disconnect();
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
