import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-driven image-sequence hero.
 *
 * Preloads a run of JPEG frames and paints them to a <canvas> that is pinned
 * (sticky) to fill the viewport while the user scrolls — the frame index is
 * mapped to scroll progress, so scrolling scrubs the "video". Canvas scrubbing
 * is smoother and more reliable than driving a <video> element's currentTime.
 *
 * Children render above the canvas (overlay, title, CTA) inside the pinned box.
 */
export default function ScrollSequence({
  frameCount,
  frameSrc,               // (index0Based) => url
  scrollLength = 2600,    // px of scroll consumed by the scrub
  zoom = 1,               // <1 pulls the subject farther back (edges blend into bg)
  onProgress,              // optional: (progress 0..1) => void, called every scrub tick
  className,
  children,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  // Kept in a ref (not the effect's dep array) so callers can pass a fresh
  // callback each render without tearing down and rebuilding the whole
  // scroll-scrub setup — only the callback identity changes, cheaply.
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    const images = new Array(frameCount);
    let current = 0;
    let raf = 0;
    let disposed = false;

    // ── Painting ──────────────────────────────────────────
    const drawCover = (img) => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = rect.width;
      const ch = rect.height;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.max(cw / iw, ch / ih) * zoom;
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    // Nearest already-decoded frame, so a fast scrub never paints blank.
    const resolve = (idx) => {
      for (let d = 0; d < frameCount; d++) {
        const a = images[idx - d];
        if (a && a.complete && a.naturalWidth) return a;
        const b = images[idx + d];
        if (b && b.complete && b.naturalWidth) return b;
      }
      return null;
    };

    const render = () => {
      raf = 0;
      const img = resolve(current);
      if (img) drawCover(img);
    };
    const schedule = () => {
      if (raf || disposed) return;
      raf = requestAnimationFrame(render);
    };

    // ── Preload ───────────────────────────────────────────
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = frameSrc(i);
      img.onload = () => {
        // Repaint if this frame is the one currently on screen (or the poster).
        if (Math.abs(i - current) <= 1) schedule();
      };
      images[i] = img;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Scroll wiring ─────────────────────────────────────
    let tl;
    const onResize = () => schedule();
    window.addEventListener("resize", onResize);

    if (reduceMotion) {
      // No pin / no scrub — just show a settled frame near the end.
      current = frameCount - 1;
      schedule();
    } else {
      const state = { frame: 0 };
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: `+=${scrollLength}`,
          scrub: 0.5,
          pin: true,
          pinSpacing: true,
          invalidateOnRefresh: true,
        },
      });
      tl.to(state, {
        frame: frameCount - 1,
        ease: "none",
        snap: "frame",
        onUpdate: () => {
          const f = Math.round(state.frame);
          if (f !== current) {
            current = f;
            schedule();
          }
          onProgressRef.current?.(state.frame / (frameCount - 1));
        },
      });
      schedule(); // paint the poster frame right away
      onProgressRef.current?.(0);
    }

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      if (tl) {
        tl.scrollTrigger?.kill();
        tl.kill();
      }
      images.forEach((img) => { if (img) img.onload = null; });
    };
  }, [frameCount, frameSrc, scrollLength, zoom]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="scroll-seq__canvas" aria-hidden="true" />
      {children}
    </div>
  );
}
