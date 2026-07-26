export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8efe9] via-[#dce8de] to-[#e4efe6] flex items-center justify-center p-4 sm:p-6">
      {children}
    </div>
  );
}
