/**
 * WebSocket helper utilities for Laravel Echo + Reverb
 */
import { handleError } from "@/lib/utils/errors";

/**
 * WORKAROUND: Bind to Pusher events directly
 * Laravel Echo's listen() doesn't work properly with Reverb broadcaster
 *
 * @param channel - The Laravel Echo channel instance
 * @param eventName - The event name to bind to
 * @param callback - The callback function to execute when event is received
 * @returns A cleanup function to unbind the event
 */
export function bindPusherEvent<T = any>(
  channel: any,
  eventName: string,
  callback: (event: T) => void
): (() => void) | null {
  try {
    // Get the underlying Pusher channel
    const pusherChannel = channel.pusher || channel.channel;

    if (!pusherChannel) {
      console.error("❌ No Pusher channel available for event:", eventName);
      return null;
    }

    // Bind directly to the event
    pusherChannel.bind(eventName, (event: T) => {
      callback(event);
    });

    // Return cleanup function
    return () => {
      pusherChannel.unbind(eventName, callback);
    };
  } catch (err) {
    handleError(err, { severity: "console", context: `Could not bind to Pusher channel for event ${eventName}` });
    return null;
  }
}

/**
 * Subscribe to project channel and bind to project.data.changed event
 *
 * @param echo - The Laravel Echo instance
 * @param projectId - The project identifier
 * @param callback - The callback function to execute when event is received
 * @returns An object with the channel and cleanup function
 */
export function subscribeToProjectChannel<T = any>(
  echo: any,
  projectId: string,
  callback: (event: T) => void
): { channel: any; cleanup: () => void } | null {
  if (!echo || !projectId) {
    console.warn("⚠️ Cannot subscribe: missing echo or projectId");
    return null;
  }

  const channel = echo.private(`project.${projectId}`);
  const unbindFn = bindPusherEvent(channel, "project.data.changed", callback);

  return {
    channel,
    cleanup: () => {
      if (unbindFn) unbindFn();
      echo.leave(`project.${projectId}`);
    },
  };
}
