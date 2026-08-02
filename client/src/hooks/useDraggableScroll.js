import { useRef, useState, useEffect } from "react";

export function useDraggableScroll() {
  const ref = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateArrows = () => {
      setShowLeftArrow(el.scrollLeft > 10);
      setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    el.addEventListener("scroll", updateArrows);
    // Initial check
    updateArrows();

    // Check again after content resizing/loading
    const resizeObserver = new ResizeObserver(updateArrows);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateArrows);
      resizeObserver.disconnect();
    };
  }, []);

  const onMouseDown = (e) => {
    const el = ref.current;
    if (!el) return;

    // Only drag with left click
    if (e.button !== 0) return;
    
    // Ignore drags that start on form controls or interactive children that are not links
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("select")) return;

    el.style.scrollBehavior = "auto";
    const startX = e.pageX - el.offsetLeft;
    const scrollLeft = el.scrollLeft;

    // A real click is never pixel-perfect — a trackpad or a slightly shaky hand
    // moves a pixel or two between press and release. The old code treated ANY
    // movement as a drag and then cancelled the click, so clicking a card in
    // this rail "sometimes did nothing". Require real intent to drag first.
    const DRAG_THRESHOLD_PX = 5;
    let isMoving = false;

    // armClickGuard: swallow the click this drag ends on, so releasing over a
    // card doesn't navigate. Only for a genuine mouseup — see onMouseMove.
    const endDrag = (armClickGuard) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      el.style.scrollBehavior = "smooth";

      // Bound to the rail rather than document, and dropped on the next tick:
      // the old version listened on document and only unregistered itself once
      // a click arrived, so a drag that wasn't followed by a click left it armed
      // and it ate the next click anywhere on the page — the "I click a related
      // product and nothing happens" bug.
      if (armClickGuard && isMoving) {
        const preventClick = (clickEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
        };
        el.addEventListener("click", preventClick, { capture: true, once: true });
        setTimeout(() => el.removeEventListener("click", preventClick, true), 0);
      }
    };

    const onMouseUp = () => endDrag(true);

    const onMouseMove = (moveEvent) => {
      // Self-heal a missed mouseup — released outside the window, gesture taken
      // by the OS. Without this the move/up listeners stay attached forever and
      // the stale drag eats a later click. No click guard here: whatever click
      // comes next is a new interaction, not the end of this drag.
      if (moveEvent.buttons === 0) return endDrag(false);

      const x = moveEvent.pageX - el.offsetLeft;
      if (!isMoving && Math.abs(x - startX) < DRAG_THRESHOLD_PX) return;
      isMoving = true;
      moveEvent.preventDefault();
      const walk = (x - startX) * 1.5; // Drag speed multiplier
      el.scrollLeft = scrollLeft - walk;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const scroll = (direction) => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth"
    });
  };

  return { ref, onMouseDown, showLeftArrow, showRightArrow, scroll };
}
