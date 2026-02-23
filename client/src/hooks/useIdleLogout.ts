import { useEffect, useRef } from 'react';

const IDLE_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
] as const;

/**
 * Logs the user out after `timeoutMs` milliseconds of inactivity.
 * Resets the timer whenever the user moves, clicks, types, scrolls, or touches.
 */
export function useIdleLogout(logout: () => Promise<void>, timeoutMs: number): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void logout();
      }, timeoutMs);
    }

    IDLE_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [logout, timeoutMs]);
}
