/* -------------------------------------------------------------
 * SCROLL.JS — Parallax ScrollTriggers, Navbar & Drawer Logic
 * ------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section");

  // ==========================================
  // 1. NAVBAR SCROLL BACKGROUND & ACTIVE LINKS
  // ==========================================
  const handleScroll = () => {
    // 50px threshold for glassmorphism
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }

    // Dynamic active links matching viewport scroll
    let currentSectionId = "";
    sections.forEach(section => {
      const top = section.offsetTop - 150; // offset for nav height
      const height = section.offsetHeight;
      if (window.scrollY >= top && window.scrollY < top + height) {
        currentSectionId = section.getAttribute("id");
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${currentSectionId}`) {
        link.classList.add("active");
      }
    });
  };

  window.addEventListener("scroll", handleScroll);
  handleScroll(); // Init call

  // ==========================================
  // 2. MOBILE DRAWER NAVIGATION MENU
  // ==========================================
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navToggle.classList.toggle("active");
      navMenu.classList.toggle("active");
    });
  }

  // Close mobile drawer when clicking navigation links
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      if (navToggle) navToggle.classList.remove("active");
      if (navMenu) navMenu.classList.remove("active");
    });
  });

  // ==========================================
  // 3. GSAP ENTRANCE & SCROLL PARALLAX
  // ==========================================
  
  // Staggered hero reveal: children enter one by one with a blur-fade
  const animateHero = () => {
    const heroContent = document.querySelector(".hero-content");
    if (!heroContent) return;

    // Snap the wrapper visible immediately so it doesn't block children
    gsap.set(heroContent, { opacity: 1, y: 0 });

    // Stagger each direct child in: blurred-and-low → sharp-and-full
    gsap.fromTo(
      heroContent.children,
      { opacity: 0, y: 28, filter: "blur(6px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.1,
        stagger: 0.16,
        ease: "power3.out",
        delay: 0.15,
        clearProps: "filter"
      }
    );

    // Parallax-style drift: hero image settles from slight zoom
    gsap.to(".hero-bg-img", {
      scale: 1,
      duration: 2.8,
      ease: "power2.out"
    });
  };

  // Check if intro curtain is actually present/visible
  const introCurtain = document.getElementById("intro-curtain");
  if (introCurtain && window.getComputedStyle(introCurtain).display !== "none") {
    // Wait for the custom finish event
    document.addEventListener("introFinished", animateHero);
  } else {
    // If skipped or not active, run immediately
    animateHero();
  }

  // Register ScrollTrigger plugin
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

    // Parallax on Brand Story Background
    gsap.to("#story-bg-parallax", {
      yPercent: 12, // vertical movement
      ease: "none",
      scrollTrigger: {
        trigger: ".story-section",
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    // Story text card fade-in and slide
    gsap.to(".story-card", {
      opacity: 1,
      x: 0,
      duration: 1.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".story-section",
        start: "top 70%",
        toggleActions: "play none none none"
      }
    });

    // Staggered order steps reveal
    gsap.fromTo(".step-card", {
      autoAlpha: 1,
      y: 24
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 1,
      stagger: 0.25,
      ease: "power2.out",
      clearProps: "opacity,visibility,transform",
      scrollTrigger: {
        trigger: ".order-section",
        start: "top 75%",
        once: true,
        toggleActions: "play none none none"
      }
    });
    
    // Staggered chevron arrows reveal
    gsap.fromTo(".step-connector", {
      autoAlpha: 1,
      scale: 0.85,
    }, {
      autoAlpha: 1,
      scale: 1,
      duration: 0.8,
      stagger: 0.25,
      ease: "back.out(2)",
      delay: 0.4,
      clearProps: "opacity,visibility,transform",
      scrollTrigger: {
        trigger: ".order-section",
        start: "top 75%",
        once: true,
        toggleActions: "play none none none"
      }
    });
  }
});
