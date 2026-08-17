export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f6f0e4] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      {/* ── Background Makkah & Madinah Golden Canvas Artwork (Full Original Clarity) ── */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: `url('/images/bg-makkah-madinah-canvas.jpg')` }}
      />

      {/* ── Soft Contrast Gradient Overlay ── */}
      <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-[1px] pointer-events-none z-0" />

      {/* ── Foreground Main Container ── */}
      <div className="relative z-10 w-full max-w-4xl my-4 sm:my-8">
        {children}
      </div>
    </div>
  );
}
