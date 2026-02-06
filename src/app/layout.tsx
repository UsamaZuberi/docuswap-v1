import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-950 text-slate-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
