export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#e4efe6] via-[#dce8de] to-[#d4e4d7] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* ── Background Makkah & Madinah Artwork with Soft Sage Overlay ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 mix-blend-multiply pointer-events-none scale-105 transition-transform duration-1000"
        style={{ backgroundImage: `url('/images/bg-makkah-madinah.png')` }}
      />
      
      {/* ── Ambient Lighting and Vignette Layers for Depth ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/10 via-transparent to-emerald-900/10 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* ── Foreground Main Container ── */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
