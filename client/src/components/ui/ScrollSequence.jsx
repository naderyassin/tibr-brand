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
  smoothing = 0.09,       // playhead time-constant (s). Lower = tighter to scroll, higher = more filmic glide.
  onProgress,              // optional: (progress 0..1) => void, called every rendered frame
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
    const maxFrame = frameCount - 1;
    // Two playheads: `targetFloat` is where scroll says we should be (updated on
    // every scroll event); `currentFloat` is where we're actually painting and
    // eases toward the target every animation frame. That easing is what turns a
    // discrete scroll into continuous, video-like motion.
    let targetFloat = 0;
    let currentFloat = 0;
    let raf = 0;
    let lastTime = 0;
    let disposed = false;

    // Cache container dimensions to avoid layout thrashing (getBoundingClientRect)
    // inside the high-frequency requestAnimationFrame render loop.
    let cw = 0;
    let ch = 0;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      cw = rect.width;
      ch = rect.height;
    };
    updateDimensions();

    // ── Painting ──────────────────────────────────────────
    const drawImageCover = (img) => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.max(cw / iw, ch / ih) * zoom;
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    const drawCoverCrossfade = (img1, img2, alpha) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetWidth = Math.round(cw * dpr);
      const targetHeight = Math.round(ch * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      // Optimize: Bypass double drawing if the crossfade is virtually complete.
      // If alpha is close to 0, only draw the first image.
      // If alpha is close to 1, only draw the second image.
      if (alpha <= 0.03 || !img2) {
        if (img1) {
          ctx.globalAlpha = 1.0;
          drawImageCover(img1);
        }
      } else if (alpha >= 0.97) {
        if (img2) {
          ctx.globalAlpha = 1.0;
          drawImageCover(img2);
        }
      } else {
        if (img1) {
          ctx.globalAlpha = 1.0;
          drawImageCover(img1);
        }
        if (img2) {
          ctx.globalAlpha = alpha;
          drawImageCover(img2);
        }
      }

      // Reset globalAlpha to default
      ctx.globalAlpha = 1.0;
    };

    // Nearest already-decoded frame, so a fast scrub never paints blank.
    const resolve = (idx) => {
      if (idx < 0 || idx >= frameCount) return null;
      const img = images[idx];
      if (img && img.complete && img.naturalWidth) return img;

      // Search outward for the nearest loaded frame
      for (let d = 1; d < frameCount; d++) {
        const a = images[idx - d];
        if (a && a.complete && a.naturalWidth) return a;
        const b = images[idx + d];
        if (b && b.complete && b.naturalWidth) return b;
      }
      return null;
    };

    let lastDrawnFloat = -1;

    // Paint a single (possibly fractional) playhead position, crossfading the
    // two bracketing frames by the fractional part.
    const paint = (value) => {
      const f1 = Math.floor(value);
      const f2 = Math.min(Math.ceil(value), maxFrame);
      const alpha = value - f1;

      // Skip a redundant repaint only when nothing has meaningfully changed.
      if (
        lastDrawnFloat !== -1 &&
        Math.abs(value - lastDrawnFloat) < 0.0015 &&
        f1 === Math.floor(lastDrawnFloat) &&
        f2 === Math.min(Math.ceil(lastDrawnFloat), maxFrame)
      ) {
        return;
      }

      lastDrawnFloat = value;
      const img1 = resolve(f1);
      const img2 = f1 === f2 ? null : resolve(f2);
      drawCoverCrossfade(img1, img2, alpha);
      onProgressRef.current?.(maxFrame > 0 ? value / maxFrame : 0);
    };

    // Continuous easing loop: runs while the displayed playhead is catching up
    // to the scroll target, then self-terminates so we don't burn frames idle.
    // Frame-rate independent — the same glide feels identical at 60/120/144 Hz.
    const SNAP = 0.0025; // frames; close enough to settle and stop the loop
    const tick = (now) => {
      raf = 0;
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
      lastTime = now;

      const delta = targetFloat - currentFloat;
      if (Math.abs(delta) <= SNAP) {
        currentFloat = targetFloat;
        paint(currentFloat);
        return; // settled — idle until the next scroll nudge
      }

      // Exponential approach: fraction covered this frame depends on elapsed
      // time, so a slow frame catches up more and the motion stays consistent.
      const k = smoothing > 0 ? 1 - Math.exp(-dt / smoothing) : 1;
      currentFloat += delta * k;
      paint(currentFloat);
      raf = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (raf || disposed) return;
      lastTime = 0; // restart the dt clock so the first step isn't oversized
      raf = requestAnimationFrame(tick);
    };

    // ── Preload ───────────────────────────────────────────
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = frameSrc(i);
      img.onload = () => {
        // Trigger background decoding on loaded images
        if (typeof img.decode === "function") {
          img.decode().catch(() => {});
        }
        // Repaint if this frame is the one currently on screen (or the poster).
        // Clear the skip-guard so a fallback frame gets swapped for the real one
        // even though the playhead position hasn't moved.
        if (Math.abs(i - currentFloat) <= 1) {
          lastDrawnFloat = -1;
          schedule();
        }
      };
      images[i] = img;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Scroll wiring ─────────────────────────────────────
    let st;
    const onResize = () => {
      updateDimensions();
      schedule();
    };
    window.addEventListener("resize", onResize);

    if (reduceMotion) {
      // No pin / no motion — just show a settled frame near the end.
      targetFloat = currentFloat = maxFrame;
      lastDrawnFloat = -1;
      paint(currentFloat);
    } else {
      // ScrollTrigger only pins the hero and reports raw progress. We do NOT use
      // its `scrub` — the easing playhead above (`tick`) supplies all the
      // smoothing, so the frame index tracks a single, continuous glide instead
      // of GSAP's scrub inertia stacked on top of Lenis' smooth wheel.
      st = ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: `+=${scrollLength}`,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          targetFloat = self.progress * maxFrame;
          schedule();
        },
        onRefresh: (self) => {
          updateDimensions();
          targetFloat = self.progress * maxFrame;
          schedule();
        },
      });

      // Start settled at wherever the page actually is on mount (bfcache /
      // scroll restoration may land us mid-hero) so there's no intro glide jump.
      targetFloat = currentFloat = st.progress * maxFrame;
      lastDrawnFloat = -1;
      paint(currentFloat);
    }

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      if (st) st.kill();
      images.forEach((img) => { if (img) img.onload = null; });
    };
  }, [frameCount, frameSrc, scrollLength, zoom, smoothing]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="scroll-seq__canvas" aria-hidden="true" />
      {children}
    </div>
  );
}
