"use client";

import { useEffect, useRef } from "react";

const CHEERS = ["보물 발견!", "찾았다!", "대박!", "Jackpot!", "득템!", "이거지!"];
const COLORS = ["#f5c518", "#ff6b6b", "#4ecdc4", "#ffe66d", "#a29bfe", "#ffffff"];
type Variant = "confetti" | "starburst" | "coins";
const VARIANTS: Variant[] = ["confetti", "starburst", "coins"];

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** 플래그를 획득한 순간의 보물 발견 이펙트. 매번 모양과 문구가 무작위로 바뀐다. */
export function AcquireBurst({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // 부모가 다시 렌더될 때마다 onDone이 바뀌어도 이펙트를 처음부터 다시 틀지 않는다.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const variant = pick(VARIANTS);
    const animations: Animation[] = [];

    const text = document.createElement("div");
    text.textContent = pick(CHEERS);
    text.className =
      "absolute left-1/2 top-1/3 -translate-x-1/2 font-heading text-6xl font-black text-[#f5c518] drop-shadow-[0_4px_0_#7a5c00]";
    root.append(text);
    animations.push(
      text.animate(
        [
          { transform: "translate(-50%, 20px) scale(0.3) rotate(-8deg)", opacity: 0 },
          { transform: "translate(-50%, 0) scale(1.25) rotate(4deg)", opacity: 1, offset: 0.25 },
          { transform: "translate(-50%, -10px) scale(1) rotate(0)", opacity: 1, offset: 0.7 },
          { transform: "translate(-50%, -40px) scale(0.9)", opacity: 0 },
        ],
        { duration: 1400, easing: "ease-out", fill: "forwards" }
      )
    );

    if (variant === "starburst") {
      const flash = document.createElement("div");
      flash.className = "absolute inset-0 bg-[radial-gradient(circle,#fff7b0cc,transparent_60%)]";
      root.append(flash);
      animations.push(flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: "forwards" }));
    }

    const count = variant === "coins" ? 24 : 48;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      const angle = Math.random() * Math.PI * 2;
      const distance = 150 + Math.random() * 350;
      if (variant === "coins") {
        piece.textContent = "🪙";
        piece.className = "absolute left-1/2 top-1/2 text-3xl";
      } else {
        piece.className = "absolute left-1/2 top-1/2 size-3";
        piece.style.background = pick(COLORS);
        piece.style.borderRadius = variant === "starburst" ? "9999px" : "2px";
      }
      root.append(piece);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + (variant === "coins" ? 200 : 0);
      animations.push(
        piece.animate(
          [
            { transform: "translate(0,0) rotate(0) scale(1)", opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 720}deg) scale(0.6)`, opacity: 0 },
          ],
          { duration: 900 + Math.random() * 600, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }
        )
      );
    }

    const timer = setTimeout(() => onDoneRef.current(), 1600);
    return () => {
      clearTimeout(timer);
      animations.forEach((a) => a.cancel());
      root.replaceChildren();
    };
  }, []);

  return <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" />;
}
