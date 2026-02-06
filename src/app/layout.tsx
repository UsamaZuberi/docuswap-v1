import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorker } from "@/components/ServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://docuswap.local";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DocuSwap",
  description: "Client-side file conversion studio for developers.",
  applicationName: "DocuSwap",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "DocuSwap",
    description: "Client-side file conversion studio for developers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DocuSwap",
    description: "Client-side file conversion studio for developers.",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-100 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100`}
      >
        <ThemeProvider>
          {children}
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
