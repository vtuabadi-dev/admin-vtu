"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, SkipForward } from "lucide-react";
import gsap from "gsap";

interface IntroVideoLoaderProps {
  onComplete?: () => void;
  forceShow?: boolean;
  videoSrc?: string;
}

export default function IntroVideoLoader({
  onComplete,
  forceShow = false,
  videoSrc,
}: IntroVideoLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>(videoSrc || "/api/assets/intro-video");

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const videoWrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const ambientGlowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768 || window.matchMedia("(max-width: 767px)").matches;
      if (!videoSrc) {
        setActiveVideoSrc(`/api/assets/intro-video?device=${isMobile ? "mobile" : "desktop"}`);
      }

      const played = sessionStorage.getItem("vtu_intro_played");
      if (played && !forceShow) {
        document.documentElement.classList.remove("intro-pending");
        setIsVisible(false);
        if (onComplete) onComplete();
      }
    }
  }, [forceShow, onComplete, videoSrc]);

  // Ambient glow subtle pulse with GSAP
  useEffect(() => {
    if (!isVisible || !ambientGlowRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(ambientGlowRef.current, {
        scale: 1.25,
        opacity: 0.35,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
    return () => ctx.revert();
  }, [isVisible]);

  // Handle Video Emergence with GSAP
  const handleVideoStart = () => {
    if (isVideoPlaying) return;
    setIsVideoPlaying(true);

    if (videoWrapperRef.current && headerRef.current) {
      gsap.fromTo(
        videoWrapperRef.current,
        { scale: 0.96, opacity: 0, filter: "blur(8px)" },
        { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out" }
      );
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.3, ease: "power2.out" }
      );
    }
  };

  // Attempt autoplay programmatically when visible
  useEffect(() => {
    if (!isVisible) return;

    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
      video.defaultMuted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            handleVideoStart();
          })
          .catch((err) => {
            console.warn("[IntroVideoLoader] Initial play blocked, trying muted force play:", err);
            video.muted = true;
            setIsMuted(true);
            video
              .play()
              .then(() => handleVideoStart())
              .catch((e) => console.warn("[IntroVideoLoader] Muted play error:", e));
          });
      }
    }

    // Safety timeout: if video stuck or fails after 14s, automatically transition
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 14000);

    return () => clearTimeout(safetyTimer);
  }, [isVisible]);

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("vtu_intro_played", "true");
      document.documentElement.classList.remove("intro-pending");
    }

    // GSAP Cinematic Dissolve to Login Screen
    const tl = gsap.timeline({
      onComplete: () => {
        setIsVisible(false);
        if (onComplete) onComplete();
      },
    });

    if (videoWrapperRef.current && overlayRef.current) {
      tl.to(videoWrapperRef.current, {
        scale: 1.04,
        opacity: 0,
        filter: "blur(12px)",
        duration: 0.65,
        ease: "power2.inOut",
      });
      tl.to(
        overlayRef.current,
        {
          opacity: 0,
          duration: 0.45,
          ease: "power2.inOut",
        },
        "-=0.25"
      );
    } else {
      setIsVisible(false);
      if (onComplete) onComplete();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col justify-between overflow-hidden will-change-transform"
    >
      {/* Subtle GSAP-Controlled Ambient Glow */}
      <div
        ref={ambientGlowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-3xl pointer-events-none"
      />

      {/* Pure Fullscreen Intro Video Player with GSAP Emergence */}
      <div
        ref={videoWrapperRef}
        className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center opacity-0"
      >
        <video
          ref={videoRef}
          autoPlay
          muted={isMuted}
          playsInline
          preload="auto"
          controls={false}
          onPlaying={handleVideoStart}
          onCanPlay={() => {
            if (videoRef.current) {
              videoRef.current.muted = isMuted;
              videoRef.current.play().catch(() => {});
            }
          }}
          onEnded={handleFinish}
          onError={(e) => {
            console.warn("[IntroVideoLoader] Video element error, finishing intro:", e);
            handleFinish();
          }}
          className="w-full h-full object-contain object-center max-w-full max-h-screen"
        >
          <source src={activeVideoSrc} type="video/mp4" />
        </video>
      </div>

      {/* Top Header Bar with GSAP Fade */}
      <div
        ref={headerRef}
        className="relative z-10 p-4 sm:p-6 flex items-center justify-end opacity-0"
      >
        <div className="flex items-center gap-3">
          {/* Audio Toggle Button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 bg-black/50 hover:bg-black/80 text-white rounded-full border border-white/25 backdrop-blur-md shadow-lg transition-all active:scale-95"
            title={isMuted ? "Nyalakan Suara Video" : "Matikan Suara"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-300" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Skip Intro Button */}
          <button
            type="button"
            onClick={handleFinish}
            className="px-4 py-2 bg-black/50 hover:bg-black/80 text-white rounded-full text-xs font-extrabold backdrop-blur-md border border-white/25 shadow-xl transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>Lewati Intro</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="relative z-10 p-4 pointer-events-none" />
    </div>
  );
}
