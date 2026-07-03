import { useEffect, useRef } from "react";
import "./GlowCard.css";

/* Hue/spread pairs for the pointer-tracked spotlight. "gold" matches the
   brand's single accent; the rest are kept for future flexibility. */
const GLOW_COLOR_MAP = {
  gold: { base: 45, spread: 70 },
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
};

const SIZE_CLASS_MAP = {
  sm: "glow-card--sm",
  md: "glow-card--md",
  lg: "glow-card--lg",
};

export default function GlowCard({
  children,
  className = "",
  glowColor = "gold",
  size = "md",
  width,
  height,
  customSize = false,
}) {
  const cardRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    // Only track pointer on devices that support hover (desktop)
    const mediaQuery = window.matchMedia("(hover: hover)");
    if (!mediaQuery.matches) return;

    const syncPointer = (e) => {
      const { clientX: x, clientY: y } = e;
      if (cardRef.current) {
        cardRef.current.style.setProperty("--x", x.toFixed(2));
        cardRef.current.style.setProperty("--xp", (x / window.innerWidth).toFixed(2));
        cardRef.current.style.setProperty("--y", y.toFixed(2));
        cardRef.current.style.setProperty("--yp", (y / window.innerHeight).toFixed(2));
      }
    };

    const handlePointerEnter = () => {
      document.addEventListener("pointermove", syncPointer);
    };

    const handlePointerLeave = () => {
      document.removeEventListener("pointermove", syncPointer);
    };

    const card = cardRef.current;
    if (card) {
      card.addEventListener("pointerenter", handlePointerEnter);
      card.addEventListener("pointerleave", handlePointerLeave);
    }

    return () => {
      if (card) {
        card.removeEventListener("pointerenter", handlePointerEnter);
        card.removeEventListener("pointerleave", handlePointerLeave);
      }
      document.removeEventListener("pointermove", syncPointer);
    };
  }, []);

  const { base, spread } = GLOW_COLOR_MAP[glowColor] ?? GLOW_COLOR_MAP.gold;

  const inlineStyle = {
    "--base": base,
    "--spread": spread,
    "--radius": "14",
    "--border": "3",
    "--backdrop": "hsl(0 0% 60% / 0.12)",
    "--backup-border": "var(--backdrop)",
    "--size": "200",
    "--outer": "1",
    "--border-size": "calc(var(--border, 2) * 1px)",
    "--spotlight-size": "calc(var(--size, 150) * 1px)",
    "--hue": "calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))",
    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.1)), transparent
    )`,
    backgroundColor: "var(--backdrop, transparent)",
    backgroundSize: "calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",
    backgroundPosition: "50% 50%",
    backgroundAttachment: "fixed",
    border: "var(--border-size) solid var(--backup-border)",
  };

  if (width !== undefined) inlineStyle.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) inlineStyle.height = typeof height === "number" ? `${height}px` : height;

  const sizeClass = customSize ? "" : SIZE_CLASS_MAP[size];

  return (
    <div
      ref={cardRef}
      data-glow
      style={inlineStyle}
      className={`glow-card ${sizeClass} ${className}`}
    >
      <div ref={innerRef} data-glow className="glow-card__layer" />
      {children}
    </div>
  );
}
