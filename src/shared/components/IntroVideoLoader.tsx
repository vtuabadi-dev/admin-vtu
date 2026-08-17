"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX, SkipForward } from "lucide-react";

interface IntroVideoLoaderProps {
  onComplete?: () => void;
  forceShow?: boolean;
  videoSrc?: string;
}

export default function IntroVideoLoader({
  onComplete,
  forceShow = false,
  videoSrc = process.env.NEXT_PUBLIC_INTRO_VIDEO_URL || "https://drive.google.com/uc?export=download&id=1jOMszvMajCWR0iVJku6hnAGKqwHWFec_",
}: IntroVideoLoaderProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Check if intro has already been shown in this session (unless forced)
    if (typeof window !== "undefined") {
      const played = sessionStorage.getItem("vtu_intro_played");
      if (!played || forceShow) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
        if (onComplete) onComplete();
      }
    }
  }, [forceShow, onComplete]);

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
          .catch((err) => {
            console.warn("[IntroVideoLoader] Initial play blocked, trying muted force play:", err);
            video.muted = true;
            setIsMuted(true);
            video
              .play()
              .catch((e) => console.warn("[IntroVideoLoader] Muted play error:", e));
          });
      }
    }

    // Safety timeout: if video stuck or fails after 12s, automatically transition to login
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 12000);

    return () => clearTimeout(safetyTimer);
  }, [isVisible]);

  const handleFinish = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("vtu_intro_played", "true");
    }
    setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      } else if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        router.push("/login");
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
      className={`fixed inset-0 z-[9999] bg-slate-950 flex flex-col justify-between overflow-hidden transition-opacity duration-700 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Pure Fullscreen Intro Video Player */}
      <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted={isMuted}
          playsInline
          preload="auto"
          controls={false}
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
          className="w-full h-full object-cover object-center"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 p-4 sm:p-6 flex items-center justify-end">
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
