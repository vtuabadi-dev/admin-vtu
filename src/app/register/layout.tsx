export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f6f0e4] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      {/* ── Soft Contrast Overlay Identical to Login Page ── */}
      <div className="fixed inset-0 bg-black/5 pointer-events-none z-0" />

      {/* ── Foreground Main Container ── */}
      <div className="relative z-10 w-full max-w-4xl my-4 sm:my-8">
        {children}
      </div>
    </div>
  );
}
