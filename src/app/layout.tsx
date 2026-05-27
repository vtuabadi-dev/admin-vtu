import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
