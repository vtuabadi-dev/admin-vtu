export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f6f0e4] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* ── Background Makkah & Madinah Golden Canvas Artwork (Full Original Clarity) ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url('/api/assets/login-bg')` }}
      />
      
      {/* ── Soft Contrast Overlay for Form Card Readability ── */}
      <div className="absolute inset-0 bg-black/5 pointer-events-none" />

      {/* ── Foreground Main Container ── */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
