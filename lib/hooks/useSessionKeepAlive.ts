import { useEffect, useCallback, useRef } from "react";
import { authApi, getLastApiCallTime } from "@/lib/api/client";

// Check every 5 minutes
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
// Ping if no API call in last 50 minutes (token expires at 60 min)
const PING_THRESHOLD = 50 * 60 * 1000; // 50 minutes
// Consider user active if activity in last 5 minutes
const ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

interface UseSessionKeepAliveOptions {
  enabled?: boolean;
  onPingError?: () => void;
}

/**
 * Hook that keeps the session alive for active users.
 *
 * How it works:
 * - Sanctum tokens expire after 60 minutes of no API activity
 * - Every API call automatically resets the expiration timer
 * - This hook tracks user activity (mouse, keyboard, etc.)
 * - If user is active but hasn't made an API call in 50 minutes, we ping the server
 * - This prevents active users from being logged out unexpectedly
 */
export function useSessionKeepAlive({
  enabled = true,
  onPingError,
}: UseSessionKeepAliveOptions = {}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isPingingRef = useRef<boolean>(false);

  // Track user activity (debounced - only update once per second max)
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Check if we need to ping
  const checkAndPing = useCallback(async () => {
    if (isPingingRef.current) return;

    const now = Date.now();
    const lastApiCall = getLastApiCallTime();
    const lastActivity = lastActivityRef.current;

    const timeSinceLastApiCall = now - lastApiCall;
    const timeSinceLastActivity = now - lastActivity;

    // Only ping if:
    // 1. No API call in last 50 minutes
    // 2. User was active in the last 5 minutes
    const needsPing = timeSinceLastApiCall > PING_THRESHOLD;
    const userIsActive = timeSinceLastActivity < ACTIVITY_THRESHOLD;

    if (needsPing && userIsActive) {
      try {
        isPingingRef.current = true;
        await authApi.ping();
      } catch {
        // Ping failed - token might be expired
        onPingError?.();
      } finally {
        isPingingRef.current = false;
      }
    }
  }, [onPingError]);

  // Handle visibility change - check when user returns to tab
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      // Update activity timestamp
      lastActivityRef.current = Date.now();
      // Check if we need to ping
      checkAndPing();
    }
  }, [checkAndPing]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Start periodic check
    intervalRef.current = setInterval(checkAndPing, CHECK_INTERVAL);

    // Add event listeners for user activity
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, handleActivity, handleVisibilityChange, checkAndPing]);
}
