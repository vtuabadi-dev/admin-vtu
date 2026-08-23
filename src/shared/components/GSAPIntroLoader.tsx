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
  const logoWrapperRef = useRef<HTMLDivElement | null>(null);
  const textContentRef = useRef<HTMLDivElement | null>(null);
  const skipBtnRef = useRef<HTMLButtonElement | null>(null);

  // Check Session Storage for Intro state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const played = sessionStorage.getItem("vtu_intro_played");
      if (played && !forceShow) {
        document.documentElement.classList.remove("intro-pending");
        setIsVisible(false);
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

      // ── Stage 1: Ambient Background & Outer Frame Emergence ──
      tl.fromTo(
        ambientGlowRef.current,
        { scale: 0.7, opacity: 0 },
        { scale: 1.15, opacity: 0.35, duration: 1.4, ease: "power2.out" }
      )
        .fromTo(
          particleLightRef.current,
          { opacity: 0, y: 30 },
          { opacity: 0.5, y: 0, duration: 1.2, ease: "sine.out" },
          "-=1.0"
        )
        .fromTo(
          frameRef.current,
          { opacity: 0, scale: 0.96 },
          { opacity: 1, scale: 1, duration: 0.9, ease: "power3.out" },
          "-=0.8"
        )

        // ── Stage 2: Glass Card & Logo Emblem Zoom Unblur ──
        .fromTo(
          cardRef.current,
          { opacity: 0, y: 25, scale: 0.92, filter: "blur(12px)" },
          { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.85, ease: "power3.out" },
          "-=0.6"
        )
        .fromTo(
          logoWrapperRef.current,
          { opacity: 0, scale: 0.85, filter: "blur(8px)" },
          { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "back.out(1.4)" },
          "-=0.45"
        )

        // ── Stage 3: Typography & Taglines Stagger Shimmer ──
        .fromTo(
          "[data-intro-text]",
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out" },
          "-=0.3"
        )
        .fromTo(
          skipBtnRef.current,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          "-=0.5"
        );

      // Continuous Ambient Floating Loops
      gsap.to(ambientGlowRef.current, {
        scale: 1.3,
        opacity: 0.45,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(particleLightRef.current, {
        opacity: 0.6,
        x: 18,
        y: -12,
        duration: 5,
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
        duration: 0.6,
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
      className="fixed inset-0 z-[9999] bg-[#07120f] text-[#f7f4ea] flex flex-col items-center justify-center overflow-hidden select-none will-change-transform font-sans"
    >
      {/* Background Radial Glow */}
      <div
        ref={ambientGlowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[650px] max-h-[650px] rounded-full bg-gradient-to-tr from-[#D4AF37]/20 via-[#F5D061]/15 to-emerald-700/10 filter blur-[90px] pointer-events-none"
      />

      {/* Particle Light */}
      <div
        ref={particleLightRef}
        className="absolute top-1/4 right-1/4 w-48 h-48 rounded-full bg-[#F5D061]/20 filter blur-[50px] pointer-events-none"
      />

      {/* Decorative Outer Golden Frame */}
      <div
        ref={frameRef}
        className="absolute inset-4 sm:inset-6 border border-[#D4AF37]/30 rounded-3xl pointer-events-none z-10"
      />

      {/* Top Right Skip Button */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30">
        <button
          ref={skipBtnRef}
          type="button"
          onClick={handleFinish}
          className="px-4 py-2 bg-[#041710]/80 hover:bg-[#062118] text-[#F5D061] rounded-full text-xs font-extrabold backdrop-blur-md border border-[#D4AF37]/40 shadow-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <span>Lewati Intro</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Main Content Card */}
      <div
        ref={cardRef}
        className="relative z-20 w-[92vw] max-w-[500px] p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#062118]/90 via-[#041710]/95 to-[#030e0b]/98 border border-[#D4AF37]/45 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center justify-center"
      >
        {/* Subtle Top Badge */}
        <div
          data-intro-text
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[11px] font-bold text-[#F5D061] mb-5 shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#F5D061]" />
          <span>VTU OPERATIONAL SYSTEM</span>
        </div>

        {/* Vauza Tamma Official Brand Logo Image */}
        <div
          ref={logoWrapperRef}
          className="relative w-full max-w-[320px] aspect-[4/3] my-2 flex items-center justify-center rounded-2xl bg-white p-4 sm:p-5 shadow-2xl border-2 border-[#D4AF37]/60"
        >
          <Image
            src="/images/vauza-tamma-logo.png"
            alt="Vauza Tamma Logo — Berkhidmat Untuk Umat"
            fill
            sizes="(max-width: 640px) 280px, 320px"
            priority
            className="object-contain p-2"
          />
        </div>

        {/* Brand Text Content */}
        <div ref={textContentRef} className="mt-5 space-y-2">
          <p
            data-intro-text
            className="text-xs sm:text-sm font-semibold tracking-wider text-emerald-200/90 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
            <span>Berkhidmat Untuk Umat</span>
            <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
          </p>

          <h1
            data-intro-text
            className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md font-serif"
          >
            Vauza Tamma <span className="text-[#F5D061]">Travel</span>
          </h1>

          <p data-intro-text className="text-[11px] sm:text-xs text-[#F5D061]/80 font-bold uppercase tracking-widest pt-1">
            ✦ ONO REGO — ONO RUPO ✦
          </p>
        </div>

        {/* Loading Progress Bar */}
        <div data-intro-text className="w-full max-w-[200px] h-1.5 bg-[#030e0b] rounded-full overflow-hidden border border-[#D4AF37]/30 mt-6">
          <div className="h-full bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] rounded-full animate-pulse w-full" />
        </div>
      </div>

      {/* Footer Blessing Text */}
      <div data-intro-text className="relative z-20 mt-6 text-center text-[#F5D061]/70 text-xs font-serif">
        <span>خَتَمَ اللهُ لَنَا وَلَكُمْ بِالْخَيْرِ</span>
      </div>
    </div>
  );
}
