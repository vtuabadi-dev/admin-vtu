"use client";

import React, { useLayoutEffect, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRoundPlus,
  HeartHandshake,
  BookOpen,
  MessageCircle,
  Loader2,
  X,
  Zap,
} from "lucide-react";
import { GSAPLink } from "@/shared/gsap/GSAPProvider";
import { useAuthStore } from "@/stores/auth-store";
import { useSession } from "@/shared/hooks/use-session";
import styles from "./login.module.css";

const portals = [
  {
    title: "Portal Pendaftaran Jamaah Umroh",
    desc: "Daftar jamaah umroh dengan mudah dan cepat secara online.",
    Icon: UserRoundPlus,
    href: "/register",
  },
  {
    title: "Pendaftaran Badal Umroh",
    desc: "Daftarkan badal umroh untuk keluarga atau kerabat tercinta.",
    Icon: HeartHandshake,
    href: "/register/badal-umroh",
  },
  {
    title: "Pendaftaran Wakaf Al-Qur'an",
    desc: "Berwakaf mushaf Al-Qur'an untuk kebaikan yang terus mengalir.",
    Icon: BookOpen,
    href: "/register/wakaf-quran",
  },
  {
    title: "Cek Status Badal & Wakaf",
    desc: "Cek status pendaftaran melalui OTP WhatsApp.",
    Icon: MessageCircle,
    href: "/track/badal-wakaf",
  },
] as const;

export default function LoginPage() {
  const root = useRef<HTMLDivElement>(null);
  const { login, loginError, clearError, isAuthenticated, role } = useSession();

  const rememberMe = useAuthStore((s) => s.rememberMe);
  const setRememberMe = useAuthStore((s) => s.setRememberMe);
  const storeLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Instant admin login handler
  const handleInstantAdminLogin = async (targetEmail = "admin@vtu.id", targetPass = "admin123") => {
    if (isSubmitting) return;
    setEmail(targetEmail);
    setPassword(targetPass);
    clearError();
    setIsSubmitting(true);
    try {
      await login(targetEmail, targetPass);
    } catch {
      // Errors handled by auth store
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hard redirect on successful login based on role
  useEffect(() => {
    if (!isAuthenticated || !role) return;

    if (role === "jamaah") {
      window.location.href = "/jamaah/dashboard";
    } else {
      window.location.href = "/admin/dashboard";
    }
  }, [isAuthenticated, role]);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearError();
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch {
      // Errors handled by auth store
    } finally {
      setIsSubmitting(false);
    }
  };

  // GSAP Entrance & Ambient Animations
  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-bg]", { scale: 1.08, opacity: 0, duration: 1.7 })
        .from("[data-brand]", { opacity: 0, y: 18, duration: 0.7 }, "-=1.1")
        .from("[data-copy] > *", { opacity: 0, y: 28, duration: 0.65, stagger: 0.09 }, "-=.35")
        .from("[data-login]", { opacity: 0, y: 28, duration: 0.8 }, "-=.3")
        .from("[data-portal]", { opacity: 0, x: 34, duration: 0.7, stagger: 0.12 }, "-=.45")
        .from("[data-footer]", { opacity: 0, y: 12, duration: 0.6 }, "-=.25");

      gsap.to("[data-glow]", {
        x: 24,
        y: -12,
        duration: 7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to("[data-light]", {
        opacity: 0.45,
        duration: 3.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.utils.toArray<HTMLElement>("[data-portal]").forEach((item) => {
        const arrow = item.querySelector("[data-arrow]");
        const enter = () => {
          gsap.to(item, { x: 7, duration: 0.3, ease: "power2.out" });
          if (arrow) gsap.to(arrow, { x: 5, duration: 0.3, ease: "power2.out" });
        };
        const leave = () => {
          gsap.to(item, { x: 0, duration: 0.35, ease: "power2.out" });
          if (arrow) gsap.to(arrow, { x: 0, duration: 0.35, ease: "power2.out" });
        };
        item.addEventListener("mouseenter", enter);
        item.addEventListener("mouseleave", leave);
      });
    }, root);

    return () => ctx.revert();
  }, []);

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#07120f]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0d99a]" />
          <p className="text-sm font-medium text-[#f0d99a]/80">Memuat sistem...</p>
        </div>
      </div>
    );
  }

  return (
    <main ref={root} className={styles.page}>
      <div data-bg className={styles.background} />
      <div data-glow className={styles.ambientGlow} />
      <div data-light className={styles.lightParticle} />
      <div className={styles.frame} aria-hidden="true" />

      <section className={styles.content}>
        {/* ── Left Side: Login Form ── */}
        <div className={styles.left}>
          <div data-brand className={styles.brand}>
            <div className={styles.brandMark}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <strong>VTU</strong>
              <span>OPERATIONAL SYSTEM</span>
            </div>
          </div>

          <div data-copy className={styles.copy}>
            <span className={styles.kicker}>Selamat datang kembali</span>
            <h1>
              Masuk ke Portal
              <br />
              <em>VTU Operasional</em>
            </h1>
            <p>
              Kelola layanan perjalanan umroh, jamaah, badal, wakaf Al-Qur&apos;an, dan operasional
              lainnya dalam satu ekosistem terintegrasi.
            </p>
          </div>

          <form data-login className={styles.login} onSubmit={handleSubmit}>
            <label htmlFor="email">
              <span>Email</span>
              <div className={styles.inputWrap}>
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </label>

            <label htmlFor="password">
              <span>Password</span>
              <div className={styles.inputWrap}>
                <LockKeyhole size={18} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className={styles.loginMeta}>
              <label className={styles.remember}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span>Ingat saya</span>
              </label>
              <button
                type="button"
                className={styles.textButton}
                onClick={() =>
                  alert("Silakan hubungi Super Admin jika Anda mengalami kendala login.")
                }
              >
                Lupa password?
              </button>
            </div>

            {/* Error Notification Banner */}
            {loginError && (
              <div className={styles.errorBanner}>
                <span>{loginError}</span>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={clearError}
                  aria-label="Tutup pesan error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Memeriksa...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className={styles.adminDivider}>
              <span>atau akses admin</span>
            </div>

            <button
              type="button"
              className={styles.adminButton}
              onClick={() => handleInstantAdminLogin("admin@vtu.id", "admin123")}
              disabled={isSubmitting}
            >
              <Zap size={16} className="text-amber-400 fill-amber-400 animate-pulse" />
              <span>⚡ Login Instan Super Admin</span>
            </button>
          </form>
        </div>

        {/* ── Right Side: 4 Public Portals ── */}
        <aside className={styles.right}>
          <div className={styles.portalHeading}>
            <span>Akses Portal Lainnya</span>
            <i />
          </div>

          <nav className={styles.portalList}>
            {portals.map(({ title, desc, Icon, href }) => (
              <GSAPLink key={href} href={href} data-portal className={styles.portal}>
                <div className={styles.portalIcon}>
                  <Icon size={21} />
                </div>
                <div className={styles.portalText}>
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </div>
                <span data-arrow className={styles.arrow}>
                  <ArrowRight size={17} />
                </span>
              </GSAPLink>
            ))}
          </nav>

          <div data-footer className={styles.footerMessage}>
            <span>خَتَمَ اللهُ لَنَا وَلَكُمْ بِالْخَيْرِ</span>
            <p>Semoga Allah menerima amal ibadah kita semua.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
