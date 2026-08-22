import type { Metadata } from "next";
import "./globals.css";
import AppIntroWrapper from "@/shared/components/AppIntroWrapper";

export const metadata: Metadata = {
  title: "VTU — Travel Operational System",
  description: "Travel Operational Automation System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="light">
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
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppIntroWrapper>{children}</AppIntroWrapper>
      </body>
    </html>
  );
}
