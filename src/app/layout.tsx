import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { CursorGlow } from "@/components/shared/cursor-glow";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Saasum — Unified CRM + ERP",
  description:
    "One shared CRM + ERP system for the Centle Group — track leads from first contact to closed deal, manage invoicing, and run referral programs.",
  keywords: [
    "CRM",
    "ERP",
    "Saasum",
    "Centle Group",
    "Lead Management",
    "Sales Pipeline",
    "Referral Tracking",
  ],
  openGraph: {
    title: "Saasum — Unified CRM + ERP",
    description: "Built for modern revenue teams.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
      </head>
      <body
        className="min-h-full bg-[#050505] text-white antialiased"
        suppressHydrationWarning
      >
        <CursorGlow />
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111111",
              border: "1px solid #222222",
              color: "#FFFFFF",
              fontFamily: "var(--font-body)",
            },
          }}
        />
      </body>
    </html>
  );
}
