import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Cross-fading full-bleed image slider. Ports the shadcn image-slider demo into
 * the TIBR store stack (plain JSX + store.css classes, no Tailwind/shadcn).
 */
export const ImageSlider = React.forwardRef(function ImageSlider(
  { images, interval = 5000, className, ...props },
  ref
) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, interval);
    return () => clearInterval(timer);
  }, [images, interval]);

  return (
    <div ref={ref} className={cn("img-slider", className)} {...props}>
      <AnimatePresence initial={false}>
        <motion.img
          key={index}
          src={images[index]}
          alt=""
          className="img-slider__img"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
      </AnimatePresence>
      <div className="img-slider__dots">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={cn("img-slider__dot", index === i && "is-active")}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
});
