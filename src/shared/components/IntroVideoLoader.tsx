"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, SkipForward, Sparkles, ShieldCheck } from "lucide-react";

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
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Menyiapkan Sistem Registrasi VTU ABADI...");
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

  // Simulate preparation progress bar & status updates
  useEffect(() => {
    if (!isVisible || isFadingOut) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + 2;
        if (next < 30) {
          setStatusMessage("Menyiapkan Sistem Registrasi VTU ABADI...");
        } else if (next < 65) {
          setStatusMessage("Memuat Master Data Paket, Klaster & Syarat Ketentuan...");
        } else if (next < 90) {
          setStatusMessage("Menghubungkan Server Keamanan & Enkripsi Data...");
        } else {
          setStatusMessage("Sistem Siap! Membuka Portal Registrasi...");
        }
        return next;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [isVisible, isFadingOut]);

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
      {/* Background Intro Video Player */}
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
        {/* Soft vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/60 pointer-events-none" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 text-white shadow-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold tracking-wider uppercase">VTU ABADI — System Initialization</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Toggle Button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-slate-700/60 backdrop-blur-md shadow-lg transition-all"
            title={isMuted ? "Nyalakan Suara Video" : "Matikan Suara"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-300" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Skip Intro Button */}
          <button
            type="button"
            onClick={handleFinish}
            className="px-4 py-2 bg-emerald-700/90 hover:bg-emerald-600 text-white rounded-full text-xs font-extrabold backdrop-blur-md border border-emerald-500/50 shadow-xl transition-all flex items-center gap-1.5"
          >
            <span>Lewati Intro</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Loading Progress Status Overlay */}
      <div className="relative z-10 p-6 sm:p-10 max-w-xl mx-auto w-full text-center space-y-4">
        {/* Glassmorphism Status Box */}
        <div className="bg-slate-900/75 backdrop-blur-xl border border-slate-700/70 p-5 rounded-2xl shadow-2xl space-y-3">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Memproses Data Di Balik Layar ({progress}%)</span>
          </div>

          <p className="text-sm font-semibold text-slate-100 min-h-[24px] transition-all">
            {statusMessage}
          </p>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400 transition-all duration-150 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-400 font-medium tracking-wide">
          Official System Intro — PT VTU ABADI TRAVEL © 2026
        </p>
      </div>
    </div>
  );
}
