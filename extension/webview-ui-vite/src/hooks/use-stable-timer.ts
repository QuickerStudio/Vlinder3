import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * useStableTimer
 *
 * A reusable, predictable timer hook designed for tool UIs.
 * - Ticks only when `isRunning` is true
 * - Persists final duration across reloads via storage (keyed per message)
 * - Prefers backend-provided durationMs/completedAt to avoid recomputation
 * - Guarantees cleanup on unmount and on state transitions
 */
export function useStableTimer(params: {
  messageTs: number
  isRunning: boolean
  backendDurationMs?: number
  backendCompletedAt?: number
  storageArea?: Storage // default sessionStorage; could pass localStorage
  tickMs?: number // default 1000ms
}) {
  const {
    messageTs,
    isRunning,
    backendDurationMs,
    backendCompletedAt,
    storageArea = typeof window !== "undefined" ? window.sessionStorage : undefined,
    tickMs = 1000,
  } = params

  const storageKey = useMemo(() => `think_final_ms_${messageTs}`, [messageTs])
  const [elapsedMs, setElapsedMs] = useState(0)
  const completionTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Prefer backend duration; otherwise restore persisted final duration
  useEffect(() => {
    try {
      if (typeof backendDurationMs === "number" && backendDurationMs >= 0) {
        completionTimeRef.current = backendDurationMs
        setElapsedMs(backendDurationMs)
        storageArea?.setItem(storageKey, String(backendDurationMs))
        return
      }
      const persisted = storageArea?.getItem(storageKey)
      if (persisted) {
        const persistedMs = parseInt(persisted, 10)
        if (!Number.isNaN(persistedMs) && persistedMs >= 0) {
          completionTimeRef.current = persistedMs
          setElapsedMs(persistedMs)
        }
      }
    } catch {}
  }, [backendDurationMs, storageArea, storageKey])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Run ticking timer only when running and no final duration yet
  useEffect(() => {
    if (isRunning && completionTimeRef.current == null) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setElapsedMs(Date.now() - messageTs)
        }, tickMs)
      }
    } else {
      // Ensure timer is stopped when not running
      stopTimer()

      // Persist final duration once when we receive a terminal signal
      if (completionTimeRef.current == null) {
        const finalTime =
          typeof backendDurationMs === "number" && backendDurationMs >= 0
            ? backendDurationMs
            : Math.max(0, (typeof backendCompletedAt === "number" ? backendCompletedAt : Date.now()) - messageTs)
        completionTimeRef.current = finalTime
        setElapsedMs(finalTime)
        try {
          storageArea?.setItem(storageKey, String(finalTime))
        } catch {}
      }
    }
    return stopTimer
  }, [isRunning, messageTs, tickMs, backendDurationMs, backendCompletedAt, storageArea, storageKey, stopTimer])

  const getDisplayMs = useCallback(() => {
    if (completionTimeRef.current != null) return completionTimeRef.current
    return elapsedMs
  }, [elapsedMs])

  return {
    elapsedMs: getDisplayMs(),
    isFinal: completionTimeRef.current != null,
    stop: stopTimer,
  }
}


