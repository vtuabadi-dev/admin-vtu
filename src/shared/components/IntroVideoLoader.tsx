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
  videoSrc = "/intro-web.mp4",
}: IntroVideoLoaderProps) {
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

  const handleFinish = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("vtu_intro_played", "true");
    }
    setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
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
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted={isMuted}
          playsInline
          onEnded={handleFinish}
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 p-4 sm:p-6 flex items-center justify-end">
        <div className="flex items-center gap-3">
          {/* Audio Toggle Button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full border border-white/20 backdrop-blur-md shadow-lg transition-all"
            title={isMuted ? "Nyalakan Suara Video" : "Matikan Suara"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-300" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Skip Intro Button */}
          <button
            type="button"
            onClick={handleFinish}
            className="px-4 py-2 bg-black/40 hover:bg-black/60 text-white rounded-full text-xs font-extrabold backdrop-blur-md border border-white/20 shadow-xl transition-all flex items-center gap-1.5"
          >
            <span>Lewati Intro</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Spacer to push video clean */}
      <div className="relative z-10 p-4 pointer-events-none" />
    </div>
  );
}
