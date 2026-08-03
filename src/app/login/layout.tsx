export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f6f0e4] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* ── Background Makkah & Madinah Golden Canvas Artwork (Gambar No. 2) ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90 mix-blend-multiply pointer-events-none scale-100 transition-transform duration-1000"
        style={{ backgroundImage: `url('/images/bg-makkah-madinah-canvas.jpg')` }}
      />
      
      {/* ── Ambient Warm Lighting & Soft Vignette Overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-amber-950/15 via-transparent to-amber-900/10 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Foreground Main Container ── */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
