/**
 * confetti.js — lightweight canvas-confetti wrapper
 * Call fireCelebration() when all tasks are done.
 */
import confetti from "canvas-confetti";

export function fireCelebration() {
  // Burst from bottom-centre — feels native and celebratory
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { x: 0.5, y: 0.9 },
    colors: ["#7C3AED", "#8B5CF6", "#F97316", "#10B981", "#F59E0B", "#ffffff"],
    scalar: 1.1,
    gravity: 0.9,
    ticks: 220,
  });

  // Second burst after 300ms for a layered effect
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { x: 0.3, y: 0.85 },
      colors: ["#7C3AED", "#F97316"],
      scalar: 0.9,
    });
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { x: 0.7, y: 0.85 },
      colors: ["#10B981", "#F59E0B"],
      scalar: 0.9,
    });
  }, 300);
}
