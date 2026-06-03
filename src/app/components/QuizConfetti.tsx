"use client";

import type { CSSProperties } from "react";

const confettiColors = [
  "#ffd166",
  "#6ae3c0",
  "#f8f1df",
  "#c5ccd6",
  "#ffffff",
] as const;

type QuizConfettiProps = {
  active: boolean;
  className?: string;
  density?: number;
};

export default function QuizConfetti({
  active,
  className = "",
  density = 34,
}: QuizConfettiProps) {
  if (!active) {
    return null;
  }

  return (
    <span className={`quiz-confetti-burst ${className}`} aria-hidden="true">
      {Array.from({ length: density }).map((_, index) => {
        const column = index % 9;
        const row = Math.floor(index / 9);
        const direction = column - 4;

        return (
          <span
            key={index}
            className="quiz-confetti-fragment"
            style={
              {
                "--quiz-confetti-color":
                  confettiColors[index % confettiColors.length],
                "--quiz-confetti-delay": `${index * 9}ms`,
                "--quiz-confetti-origin-y": `${22 + row * 4}%`,
                "--quiz-confetti-rotate": `${index * 23}deg`,
                "--quiz-confetti-x": `${direction * 28 + (row % 2) * 10}px`,
                "--quiz-confetti-y": `${88 + row * 18}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
