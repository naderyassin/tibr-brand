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
  scrub = 1.2,            // scrub momentum/smoothing (higher values add more inertia)
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
    let currentFloat = 0;
    let raf = 0;
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

    const render = () => {
      raf = 0;
      
      const f1 = Math.floor(currentFloat);
      const f2 = Math.min(Math.ceil(currentFloat), frameCount - 1);
      const alpha = currentFloat - f1;

      // Optimize: Skip drawing if the scroll movement is negligible (less than 1% of a frame)
      // and we are still within the same integer frame steps.
      const diff = Math.abs(currentFloat - lastDrawnFloat);
      const lastF1 = Math.floor(lastDrawnFloat);
      const lastF2 = Math.min(Math.ceil(lastDrawnFloat), frameCount - 1);
      if (lastDrawnFloat !== -1 && diff < 0.01 && f1 === lastF1 && f2 === lastF2) {
        return;
      }

      lastDrawnFloat = currentFloat;

      const img1 = resolve(f1);
      const img2 = f1 === f2 ? null : resolve(f2);

      drawCoverCrossfade(img1, img2, alpha);
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
        // Trigger background decoding on loaded images
        if (typeof img.decode === "function") {
          img.decode().catch(() => {});
        }
        // Repaint if this frame is the one currently on screen (or the poster).
        if (Math.abs(i - currentFloat) <= 1) schedule();
      };
      images[i] = img;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Scroll wiring ─────────────────────────────────────
    let tl;
    const onResize = () => {
      updateDimensions();
      schedule();
    };
    window.addEventListener("resize", onResize);

    if (reduceMotion) {
      // No pin / no scrub — just show a settled frame near the end.
      currentFloat = frameCount - 1;
      schedule();
    } else {
      const state = { frame: 0 };
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: `+=${scrollLength}`,
          scrub: scrub,
          pin: true,
          pinSpacing: true,
          invalidateOnRefresh: true,
        },
      });
      tl.to(state, {
        frame: frameCount - 1,
        ease: "none",
        onUpdate: () => {
          currentFloat = state.frame;
          schedule();
          onProgressRef.current?.(state.frame / (frameCount - 1));
        },
      });
      schedule(); // paint the poster frame right away
      // Reflects wherever the page actually is on mount (GSAP snaps the
      // scrub's initial playhead to current scroll position) rather than
      // assuming 0 — a page that mounts already scrolled into the hero
      // (bfcache, scroll restoration) must still get a correct first read.
      onProgressRef.current?.(state.frame / (frameCount - 1));
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
