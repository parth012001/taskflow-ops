"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface ConfettiCelebrationProps {
  trigger: boolean;
  onComplete?: () => void;
  type?: "task-completion" | "streak-milestone";
}

export function ConfettiCelebration({
  trigger,
  onComplete,
  type = "task-completion",
}: ConfettiCelebrationProps) {
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref up to date without causing effect re-runs
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!trigger) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    if (type === "streak-milestone") {
      // More elaborate celebration for streak milestones
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      intervalId = setInterval(() => {
        if (cancelled) return;

        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          if (intervalId) clearInterval(intervalId);
          if (!cancelled) onCompleteRef.current?.();
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Confetti from both sides
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#ffd700", "#ff6b6b", "#4ecdc4", "#a855f7"],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#ffd700", "#ff6b6b", "#4ecdc4", "#a855f7"],
        });
      }, 250);
    } else {
      // Simple celebration for task completion
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#3b82f6", "#eab308", "#a855f7"],
        zIndex: 9999,
      });

      // Fire a few more bursts
      timeoutIds.push(
        setTimeout(() => {
          if (cancelled) return;
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#22c55e", "#3b82f6", "#eab308"],
            zIndex: 9999,
          });
        }, 200)
      );

      timeoutIds.push(
        setTimeout(() => {
          if (cancelled) return;
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#22c55e", "#3b82f6", "#eab308"],
            zIndex: 9999,
          });
        }, 400)
      );

      timeoutIds.push(
        setTimeout(() => {
          if (!cancelled) onCompleteRef.current?.();
        }, 1500)
      );
    }

    // Cleanup function to prevent memory leaks
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, [trigger, type]);

  // This component doesn't render anything visible
  return null;
}
