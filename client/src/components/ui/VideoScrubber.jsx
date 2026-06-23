import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function VideoScrubber({ src, className }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    let tl;

    const setupScrollTrigger = () => {
      // Ensure video is parsed and duration is known
      if (isNaN(video.duration)) return;

      // We use a timeline to animate the video's currentTime
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "+=2000", // 2000px of scrolling
          scrub: true,
          pin: true,
        }
      });

      // Animate currentTime from 0 to video.duration
      tl.fromTo(
        video,
        { currentTime: 0 },
        { currentTime: video.duration || 1, ease: "none" }
      );
    };

    if (video.readyState >= 1) {
      setupScrollTrigger();
    } else {
      video.addEventListener("loadedmetadata", setupScrollTrigger);
    }

    return () => {
      video.removeEventListener("loadedmetadata", setupScrollTrigger);
      if (tl) {
        tl.scrollTrigger?.kill();
        tl.kill();
      }
    };
  }, [src]);

  return (
    <div ref={containerRef} className={`w-full h-screen relative overflow-hidden ${className || ""}`}>
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        preload="auto"
      />
    </div>
  );
}
