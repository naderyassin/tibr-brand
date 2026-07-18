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

    let isMoving = false;

    const onMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const x = moveEvent.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5; // Drag speed multiplier
      el.scrollLeft = scrollLeft - walk;
      isMoving = true;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      el.style.scrollBehavior = "smooth";
      
      // If we actually dragged, prevent click events so we don't trigger link navigation
      if (isMoving) {
        const preventClick = (clickEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          document.removeEventListener("click", preventClick, true);
        };
        document.addEventListener("click", preventClick, true);
      }
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
