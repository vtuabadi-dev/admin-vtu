import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppIntroWrapper from "@/shared/components/AppIntroWrapper";

export const metadata: Metadata = {
  title: "VTU — Travel Operational System",
  description: "Travel Operational Automation & Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VTU Operasional",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07120f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="light bg-slate-50">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (!sessionStorage.getItem('vtu_intro_played')) {
                  document.documentElement.classList.add('intro-pending');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-600/20 selection:text-emerald-900">
        <AppIntroWrapper>{children}</AppIntroWrapper>
      </body>
    </html>
  );
}
