import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "LUMA — Distance doesn't have to feel distant.",
  description:
    "A private, modern digital sanctuary designed exclusively for two. Crystal-clear video, synchronized streaming, and intimate presence for couples.",
  keywords: ["long distance relationship", "watch together", "couples app", "private room", "webrtc co-presence"],
  authors: [{ name: "LUMA" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} dark h-full`}>
      <body className="min-h-full flex flex-col bg-[#0B0B10] text-[#FFFFFF] antialiased selection:bg-purple-500/30 selection:text-purple-200">
        {children}
      </body>
    </html>
  );
}
