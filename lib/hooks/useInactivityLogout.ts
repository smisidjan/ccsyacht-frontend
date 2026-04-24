import { useEffect, useCallback, useRef } from "react";

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

interface UseInactivityLogoutOptions {
  onLogout: () => void;
  timeout?: number;
  enabled?: boolean;
}

/**
 * Hook that automatically logs out the user after a period of inactivity.
 * Default timeout is 1 hour.
 */
export function useInactivityLogout({
  onLogout,
  timeout = INACTIVITY_TIMEOUT,
  enabled = true,
}: UseInactivityLogoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        onLogout();
      }, timeout);
    }
  }, [onLogout, timeout, enabled]);

  // Handle activity events
  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Handle visibility change (user switches tabs/minimizes browser)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      // Check if we've been away longer than the timeout
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= timeout) {
        onLogout();
      } else {
        // Reset the timer with remaining time
        resetTimer();
      }
    }
  }, [timeout, onLogout, resetTimer]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Start the initial timer
    resetTimer();

    // Add event listeners for user activity
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, handleActivity, handleVisibilityChange, resetTimer]);

  return {
    resetTimer,
  };
}
