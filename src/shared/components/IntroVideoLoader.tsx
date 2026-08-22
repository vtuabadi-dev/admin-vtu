"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, SkipForward } from "lucide-react";

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
  // Start with isVisible = true by default to guarantee ZERO flash of login page
  const [isVisible, setIsVisible] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>(videoSrc || "/api/assets/intro-video");
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
            setIsVideoPlaying(true);
          })
          .catch((err) => {
            console.warn("[IntroVideoLoader] Initial play blocked, trying muted force play:", err);
            video.muted = true;
            setIsMuted(true);
            video
              .play()
              .then(() => setIsVideoPlaying(true))
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
    if (isFadingOut) return;
    setIsFadingOut(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("vtu_intro_played", "true");
      document.documentElement.classList.remove("intro-pending");
    }
    setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, 700);
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
      className={`fixed inset-0 z-[9999] bg-slate-950 flex flex-col justify-between overflow-hidden transition-opacity duration-700 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Subtle Cinematic Ambient Backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Pure Fullscreen Intro Video Player with Smooth Emergence */}
      <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted={isMuted}
          playsInline
          preload="auto"
          controls={false}
          onPlaying={() => setIsVideoPlaying(true)}
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
          className={`w-full h-full object-contain object-center max-w-full max-h-screen transition-all duration-700 ease-out ${
            isVideoPlaying ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"
          }`}
        >
          <source src={activeVideoSrc} type="video/mp4" />
        </video>
      </div>

      {/* Top Header Bar */}
      <div
        className={`relative z-10 p-4 sm:p-6 flex items-center justify-end transition-opacity duration-700 delay-300 ${
          isVideoPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Audio Toggle Button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 bg-black/50 hover:bg-black/80 text-white rounded-full border border-white/25 backdrop-blur-md shadow-lg transition-all"
            title={isMuted ? "Nyalakan Suara Video" : "Matikan Suara"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-300" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Skip Intro Button */}
          <button
            type="button"
            onClick={handleFinish}
            className="px-4 py-2 bg-black/50 hover:bg-black/80 text-white rounded-full text-xs font-extrabold backdrop-blur-md border border-white/25 shadow-xl transition-all flex items-center gap-1.5"
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
