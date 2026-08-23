"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { SkipForward, ShieldCheck, Sparkles } from "lucide-react";
import gsap from "gsap";

interface GSAPIntroLoaderProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export default function GSAPIntroLoader({
  onComplete,
  forceShow = false,
}: GSAPIntroLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const ambientGlowRef = useRef<HTMLDivElement | null>(null);
  const particleLightRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const emblemWrapperRef = useRef<HTMLDivElement | null>(null);
  const textContentRef = useRef<HTMLDivElement | null>(null);
  const skipBtnRef = useRef<HTMLButtonElement | null>(null);

  // Check Session Storage for Intro state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const played = sessionStorage.getItem("vtu_intro_played");
      if (played && !forceShow) {
        document.documentElement.classList.remove("intro-pending");
        setIsVisible(false);
        window.dispatchEvent(new CustomEvent("vtu:intro-complete"));
        if (onComplete) onComplete();
      }
    }
  }, [forceShow, onComplete]);

  // Master GSAP Intro Timeline
  useEffect(() => {
    if (!isVisible || !overlayRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          handleFinish();
        },
      });

      // ── Stage 1: Ambient Glow & Golden Outer Frame ──
      tl.fromTo(
        ambientGlowRef.current,
        { scale: 0.7, opacity: 0 },
        { scale: 1.15, opacity: 0.4, duration: 1.4, ease: "power2.out" }
      )
        .fromTo(
          particleLightRef.current,
          { opacity: 0, y: 30 },
          { opacity: 0.55, y: 0, duration: 1.2, ease: "sine.out" },
          "-=1.0"
        )
        .fromTo(
          frameRef.current,
          { opacity: 0, scale: 0.96 },
          { opacity: 1, scale: 1, duration: 0.9, ease: "power3.out" },
          "-=0.8"
        )

        // ── Stage 2: Glass Card & Vauza Tamma Emblem Zoom Unblur ──
        .fromTo(
          cardRef.current,
          { opacity: 0, y: 25, scale: 0.92, filter: "blur(12px)" },
          { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.85, ease: "power3.out" },
          "-=0.6"
        )
        .fromTo(
          emblemWrapperRef.current,
          { opacity: 0, scale: 0.75, filter: "blur(10px)", rotation: -6 },
          { opacity: 1, scale: 1, filter: "blur(0px)", rotation: 0, duration: 0.85, ease: "back.out(1.5)" },
          "-=0.45"
        )

        // ── Stage 3: Typography Stagger Reveal ──
        .fromTo(
          "[data-intro-text]",
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.11, ease: "power2.out" },
          "-=0.3"
        )
        .fromTo(
          skipBtnRef.current,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          "-=0.5"
        );

      // Continuous Ambient Floating & Emblem Pulsing
      gsap.to(ambientGlowRef.current, {
        scale: 1.3,
        opacity: 0.5,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(particleLightRef.current, {
        opacity: 0.65,
        x: 18,
        y: -12,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(emblemWrapperRef.current, {
        y: -6,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, overlayRef.current);

    return () => ctx.revert();
  }, [isVisible]);

  // Handle Finish & Smooth Curtain Dissolve
  const handleFinish = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("vtu_intro_played", "true");
      document.documentElement.classList.remove("intro-pending");
      window.dispatchEvent(new CustomEvent("vtu:intro-complete"));
    }

    if (!overlayRef.current) {
      setIsVisible(false);
      if (onComplete) onComplete();
      return;
    }

    const fadeTl = gsap.timeline({
      onComplete: () => {
        setIsVisible(false);
        if (onComplete) onComplete();
      },
    });

    fadeTl
      .to(cardRef.current, {
        scale: 1.05,
        opacity: 0,
        filter: "blur(14px)",
        duration: 0.55,
        ease: "power2.inOut",
      })
      .to(
        overlayRef.current,
        {
          opacity: 0,
          duration: 0.4,
          ease: "power2.inOut",
        },
        "-=0.25"
      );
  };

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] bg-[#07120f] text-[#f7f4ea] flex flex-col items-center justify-center overflow-hidden select-none font-sans"
    >
      {/* Background Radial Gold & Emerald Glow */}
      <div
        ref={ambientGlowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[75vw] max-w-[680px] max-h-[680px] rounded-full bg-gradient-to-tr from-[#D4AF37]/25 via-[#F5D061]/20 to-emerald-700/15 filter blur-[95px] pointer-events-none opacity-0"
      />

      {/* Particle Light */}
      <div
        ref={particleLightRef}
        className="absolute top-1/4 right-1/4 w-52 h-52 rounded-full bg-[#F5D061]/25 filter blur-[55px] pointer-events-none opacity-0"
      />

      {/* Decorative Outer Golden Frame */}
      <div
        ref={frameRef}
        className="absolute inset-4 sm:inset-6 border border-[#D4AF37]/35 rounded-3xl pointer-events-none z-10 opacity-0"
      />

      {/* Top Right Skip Button */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30">
        <button
          ref={skipBtnRef}
          type="button"
          onClick={handleFinish}
          className="px-4 py-2 bg-[#041710]/80 hover:bg-[#062118] text-[#F5D061] rounded-full text-xs font-extrabold backdrop-blur-md border border-[#D4AF37]/45 shadow-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer opacity-0"
        >
          <span>Lewati Intro</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Main Content Card */}
      <div
        ref={cardRef}
        className="relative z-20 w-[90vw] max-w-[480px] p-6 sm:p-9 rounded-3xl bg-gradient-to-b from-[#062118]/92 via-[#041710]/96 to-[#030e0b]/99 border border-[#D4AF37]/50 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center justify-center opacity-0"
      >
        {/* Top Badge */}
        <div
          data-intro-text
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[11px] font-bold text-[#F5D061] mb-4 shadow-xs opacity-0"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#F5D061]" />
          <span>VTU OPERATIONAL SYSTEM</span>
        </div>

        {/* Vauza Tamma Emblem Logo (Isolated Green/Gold Checkmark & 5 Red Spheres) */}
        <div
          ref={emblemWrapperRef}
          className="relative w-36 h-36 sm:w-44 sm:h-44 my-2 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#062118] via-[#0E4334] to-[#041710] p-4 shadow-2xl border-2 border-[#D4AF37]/60 opacity-0"
        >
          {/* Subtle Radial Golden Halo Ring Behind Emblem */}
          <div className="absolute inset-0 rounded-full bg-radial from-[#F5D061]/25 via-[#D4AF37]/10 to-transparent blur-md pointer-events-none" />

          <div className="relative w-full h-full">
            <Image
              src="/images/vauza-tamma-emblem.png"
              alt="Vauza Tamma Emblem"
              fill
              sizes="(max-width: 640px) 144px, 176px"
              priority
              className="object-contain p-1 filter drop-shadow-[0_4px_12px_rgba(212,175,55,0.35)]"
            />
          </div>
        </div>

        {/* Brand Text Content */}
        <div ref={textContentRef} className="mt-4 space-y-1.5">
          <p
            data-intro-text
            className="text-xs sm:text-sm font-semibold tracking-wider text-emerald-200/90 flex items-center justify-center gap-1.5 opacity-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
            <span>Berkhidmat Untuk Umat</span>
            <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
          </p>

          <h1
            data-intro-text
            className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md font-serif text-white opacity-0"
          >
            Vauza Tamma <span className="bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent">Travel</span>
          </h1>

          <p data-intro-text className="text-[11px] sm:text-xs text-[#F5D061]/85 font-extrabold uppercase tracking-widest pt-0.5 opacity-0">
            ✦ ONO REGO — ONO RUPO ✦
          </p>
        </div>

        {/* Loading Progress Bar */}
        <div data-intro-text className="w-full max-w-[180px] h-1.5 bg-[#030e0b] rounded-full overflow-hidden border border-[#D4AF37]/35 mt-6 opacity-0">
          <div className="h-full bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] rounded-full animate-pulse w-full" />
        </div>
      </div>

      {/* Footer Blessing Text */}
      <div data-intro-text className="relative z-20 mt-5 text-center text-[#F5D061]/75 text-xs font-serif opacity-0">
        <span>خَتَمَ اللهُ لَنَا وَلَكُمْ بِالْخَيْرِ</span>
      </div>
    </div>
  );
}
