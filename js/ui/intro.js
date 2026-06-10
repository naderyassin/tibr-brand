/* -------------------------------------------------------------
 * INTRO.JS — Cinematic Entrance: Arabesque Reveal, Portal Ring,
 *            Ornament Draw, Curtain Lift, Warm Amber Exit
 * ------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const body = document.body;
  const curtain = document.getElementById("intro-curtain");
  const skipBtn = document.getElementById("skip-btn");

  if (!curtain) return;

  // Skip intro on every visit after the first
  if (localStorage.getItem("rb_intro_seen")) {
    curtain.style.display = "none";
    body.classList.remove("intro-active");
    document.dispatchEvent(new CustomEvent("introFinished"));
    return;
  }

  const bgGlow       = curtain.querySelector(".intro-bg-glow");
  const arabesque    = curtain.querySelector(".intro-arabesque");
  const bokehLayer   = document.getElementById("intro-bokeh-layer");
  const glowRing     = document.getElementById("intro-glow-ring");
  const exitFlash    = document.getElementById("intro-exit-flash");
  const ornTop       = curtain.querySelector(".intro-ornament-top");
  const ornBottom    = curtain.querySelector(".intro-ornament-bottom");
  const pathsLeft    = curtain.querySelectorAll(".orn-path-left");
  const pathsRight   = curtain.querySelectorAll(".orn-path-right");
  const diamonds     = curtain.querySelectorAll(".orn-diamond");
  const accents      = curtain.querySelectorAll(".orn-accents");
  const logoAr       = curtain.querySelector(".intro-logo-ar");
  const logoEn       = curtain.querySelector(".intro-logo-en");
  const tagline      = curtain.querySelector(".intro-tagline");

  body.classList.add("intro-active");

  // ─── Bokeh Orbs ────────────────────────────────────────────────
  // Persistent warm ambient light circles — drifting softly
  if (bokehLayer) {
    const orbs = [
      { size: 150, x:  7, y: 12, a: 0.055, dur: 9.5 },
      { size: 95,  x: 80, y: 58, a: 0.045, dur: 11  },
      { size: 120, x: 13, y: 62, a: 0.05,  dur: 10.5 },
      { size: 85,  x: 84, y:  8, a: 0.065, dur: 8.5 },
      { size: 105, x: 52, y: 78, a: 0.045, dur: 12  },
      { size: 75,  x: 38, y:  4, a: 0.055, dur: 9   },
    ];

    orbs.forEach(({ size, x, y, a, dur }) => {
      const orb = document.createElement("div");
      orb.className = "bokeh-orb";
      orb.style.cssText = `
        width:${size}px; height:${size}px;
        left:${x}%; top:${y}%;
        background:radial-gradient(circle at 38% 38%,
          rgba(201,168,76,${(a * 2).toFixed(3)}) 0%,
          rgba(160,110,40,${a.toFixed(3)}) 40%,
          transparent 68%);
        filter:blur(${Math.round(size * 0.24)}px);
      `;
      bokehLayer.appendChild(orb);

      gsap.to(orb, {
        y: `-=${Math.random() * 45 + 18}`,
        x: `+=${(Math.random() - 0.5) * 32}`,
        duration: dur,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });
    });
  }

  // ─── Sand Particles ─────────────────────────────────────────────
  // Fine gold dust that rises — layered over bokeh
  let sandInterval;

  const createSandParticle = () => {
    const p = document.createElement("div");
    const size = Math.random() * 2.2 + 0.7;
    const startX = Math.random() * window.innerWidth;
    const colors = ['#C9A84C', '#EDE0C8', '#9A7A3F', '#D4AF37'];
    p.style.cssText = `
      position:absolute; bottom:-10px; left:${startX}px;
      width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:50%; pointer-events:none; z-index:2;
      opacity:${(Math.random() * 0.45 + 0.25).toFixed(2)};
    `;
    curtain.appendChild(p);
    gsap.to(p, {
      y: -(window.innerHeight + 60),
      x: `+=${(Math.random() - 0.5) * 180}`,
      duration: Math.random() * 2.2 + 1.6,
      ease: "power1.out",
      onComplete: () => p.remove()
    });
  };

  const startSand = () => {
    sandInterval = setInterval(() => {
      for (let i = 0; i < 5; i++) createSandParticle();
    }, 70);
  };

  const stopSand = () => clearInterval(sandInterval);

  // Mouse-reactive dust displacement
  curtain.addEventListener("mousemove", (e) => {
    for (let i = 0; i < 2; i++) {
      const p = document.createElement("div");
      const size = Math.random() * 2.5 + 1;
      const colors = ['#C9A84C', '#EDE0C8', '#D4AF37'];
      p.style.cssText = `
        position:absolute;
        top:${e.clientY + (Math.random() * 40 - 20)}px;
        left:${e.clientX + (Math.random() * 40 - 20)}px;
        width:${size}px; height:${size}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        border-radius:50%; pointer-events:none; z-index:4;
        opacity:${(Math.random() * 0.6 + 0.25).toFixed(2)};
      `;
      curtain.appendChild(p);
      gsap.to(p, {
        y: `+=${Math.random() * 130 + 40}`,
        x: `+=${(Math.random() - 0.5) * 80}`,
        opacity: 0,
        duration: Math.random() + 0.5,
        ease: "power2.out",
        onComplete: () => p.remove()
      });
    }
  });

  // ─── Reveal Function ─────────────────────────────────────────────
  function revealPage() {
    stopSand();

    const exitTl = gsap.timeline({
      onComplete: () => {
        localStorage.setItem("rb_intro_seen", "1");
        body.classList.remove("intro-active");
        curtain.style.display = "none";
        document.dispatchEvent(new CustomEvent("introFinished"));
      }
    });

    // Warm amber flash blooms at the center
    if (exitFlash) {
      exitTl.to(exitFlash, { opacity: 1, duration: 0.45, ease: "power2.out" }, 0);
      exitTl.to(exitFlash, { opacity: 0, duration: 0.55, ease: "power1.in" }, 0.38);
    }

    // Content elements lift and dissolve
    exitTl.to(skipBtn, { opacity: 0, duration: 0.25 }, 0);
    exitTl.to([logoAr, logoEn, tagline, ornTop, ornBottom], {
      opacity: 0,
      y: -22,
      duration: 0.6,
      stagger: 0.04,
      ease: "power2.in"
    }, 0.08);

    // Bokeh and arabesque fade
    if (bokehLayer) exitTl.to(bokehLayer, { opacity: 0, duration: 0.5 }, 0);
    if (arabesque) exitTl.to(arabesque, { opacity: 0, duration: 0.5 }, 0);

    // Iris wipe: dark curtain collapses to a vanishing point
    exitTl.to(curtain, {
      clipPath: "circle(0% at 50% 50%)",
      duration: 1.0,
      ease: "power2.in"
    }, 0.32);
  }

  // ─── Master Timeline ─────────────────────────────────────────────
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // Establish starting states
  gsap.set(curtain, { clipPath: "circle(150% at 50% 50%)" });
  gsap.set(bgGlow, { opacity: 0 });
  if (arabesque) gsap.set(arabesque, { opacity: 0 });
  if (bokehLayer) gsap.set(bokehLayer, { opacity: 0 });
  if (glowRing) gsap.set(glowRing, { xPercent: -50, yPercent: -50, scale: 0.55, opacity: 0 });
  if (exitFlash) gsap.set(exitFlash, { opacity: 0 });
  gsap.set([ornTop, ornBottom], { opacity: 1 });
  gsap.set(logoAr, { y: "110%" });
  gsap.set(logoEn, { opacity: 0, letterSpacing: "26px" });
  gsap.set(tagline, { opacity: 0, filter: "blur(12px)" });
  gsap.set(accents, { opacity: 0 });
  gsap.set(skipBtn, { opacity: 0 });

  // 0.0s → Arabesque tile pattern materialises subtly
  if (arabesque) {
    tl.to(arabesque, { opacity: 0.55, duration: 2.2, ease: "power1.inOut" }, 0.0);
  }

  // 0.1s → Portal glow ring blooms from center
  if (glowRing) {
    tl.to(glowRing, {
      opacity: 1,
      scale: 1,
      duration: 1.1,
      ease: "power2.out"
    }, 0.1);
  }

  // 0.3s → Atmospheric amber glow blooms
  tl.to(bgGlow, { opacity: 1, duration: 2.0, ease: "power1.inOut" }, 0.3);

  // 0.6s → Top ornament draws from center outward
  tl.to([pathsLeft[0], pathsRight[0]], {
    strokeDashoffset: 0,
    duration: 0.85,
    stagger: 0.06,
    ease: "power2.inOut"
  }, 0.6);

  // 1.0s → Ring fades as logo prepares to arrive (energy transfers)
  if (glowRing) {
    tl.to(glowRing, {
      opacity: 0,
      scale: 1.35,
      duration: 1.0,
      ease: "power1.in"
    }, 1.0);
  }

  // 1.1s → Top diamond materialises
  tl.to(diamonds[0], { opacity: 1, duration: 0.25 }, 1.1);

  // 1.2s → Arabic logo rises: the curtain lift
  tl.to(logoAr, {
    y: "0%",
    duration: 1.1,
    ease: "power3.out"
  }, 1.2);

  // 1.7s → Top accent marks appear (subtle detail after lines settle)
  tl.to(accents[0], { opacity: 1, duration: 0.7, ease: "power1.out" }, 1.7);

  // 1.9s → Bottom ornament draws in
  tl.to([pathsLeft[1], pathsRight[1]], {
    strokeDashoffset: 0,
    duration: 0.85,
    stagger: 0.06,
    ease: "power2.inOut"
  }, 1.9);

  // 2.1s → English subtitle contracts from wide tracking
  tl.to(logoEn, {
    opacity: 1,
    letterSpacing: "8px",
    duration: 1.1,
    ease: "power2.out"
  }, 2.1);

  // 2.35s → Bottom diamond
  tl.to(diamonds[1], { opacity: 1, duration: 0.25 }, 2.35);

  // 2.5s → Bottom accent marks
  tl.to(accents[1], { opacity: 1, duration: 0.7, ease: "power1.out" }, 2.5);

  // 3.0s → Tagline resolves through blur
  tl.to(tagline, {
    opacity: 1,
    filter: "blur(0px)",
    duration: 1.5,
    ease: "power2.out"
  }, 3.0);

  // 3.2s → Skip button fades in
  tl.to(skipBtn, { opacity: 1, duration: 0.9 }, 3.2);

  // 3.4s → Bokeh orbs and sand particles appear
  if (bokehLayer) tl.to(bokehLayer, { opacity: 1, duration: 1.4, ease: "power1.inOut" }, 3.4);
  tl.add(startSand, 3.6);

  // 5.8s → Auto-reveal
  tl.add(revealPage, 5.8);

  skipBtn.addEventListener("click", () => {
    tl.kill();
    revealPage();
  });
});
