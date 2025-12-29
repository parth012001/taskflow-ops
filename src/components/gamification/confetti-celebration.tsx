"use client";

import { useEffect, useCallback } from "react";
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
  const fireConfetti = useCallback(() => {
    if (type === "streak-milestone") {
      // More elaborate celebration for streak milestones
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          onComplete?.();
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
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#22c55e", "#3b82f6", "#eab308"],
          zIndex: 9999,
        });
      }, 200);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#22c55e", "#3b82f6", "#eab308"],
          zIndex: 9999,
        });
      }, 400);

      setTimeout(() => {
        onComplete?.();
      }, 1500);
    }
  }, [type, onComplete]);

  useEffect(() => {
    if (trigger) {
      fireConfetti();
    }
  }, [trigger, fireConfetti]);

  // This component doesn't render anything visible
  return null;
}
