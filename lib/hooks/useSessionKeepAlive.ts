import { useEffect, useCallback, useRef } from "react";
import { authApi, getLastApiCallTime } from "@/lib/api/client";

// Check every 2 minutes for more responsive keep-alive
const CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes
// Ping if no API call in last 45 minutes (token expires at 60 min, gives 15 min buffer)
const PING_THRESHOLD = 45 * 60 * 1000; // 45 minutes

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "focus",
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
 * - If user was active since the last API call and we're approaching expiration, we ping
 * - This prevents active users from being logged out unexpectedly
 *
 * Key improvement: We track if user was active AT ANY POINT since the last API call,
 * not just in the last few minutes. This prevents logout when user is reading/viewing.
 */
export function useSessionKeepAlive({
  enabled = true,
  onPingError,
}: UseSessionKeepAliveOptions = {}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  // Track if user was active since the last API call
  const hadActivitySinceLastApiCallRef = useRef<boolean>(true);
  const isPingingRef = useRef<boolean>(false);
  const lastKnownApiCallRef = useRef<number>(Date.now());

  // Track user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    hadActivitySinceLastApiCallRef.current = true;
  }, []);

  // Check if we need to ping
  const checkAndPing = useCallback(async () => {
    if (isPingingRef.current) return;

    const now = Date.now();
    const lastApiCall = getLastApiCallTime();
    const timeSinceLastApiCall = now - lastApiCall;

    // Reset activity tracking if a new API call was made
    if (lastApiCall > lastKnownApiCallRef.current) {
      lastKnownApiCallRef.current = lastApiCall;
      hadActivitySinceLastApiCallRef.current = false;
    }

    // Ping if:
    // 1. No API call in last 45 minutes (approaching 60 min expiration)
    // 2. User had ANY activity since the last API call (even if they're idle now)
    const needsPing = timeSinceLastApiCall > PING_THRESHOLD;
    const userWasActive = hadActivitySinceLastApiCallRef.current;

    if (needsPing && userWasActive) {
      try {
        isPingingRef.current = true;
        await authApi.ping();
        // Reset activity tracking after successful ping
        hadActivitySinceLastApiCallRef.current = false;
        lastKnownApiCallRef.current = Date.now();
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
      hadActivitySinceLastApiCallRef.current = true;
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
