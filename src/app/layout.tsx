import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Playlist Guess — Spotify Music Quiz",
  description:
    "Log in with Spotify, pick a playlist, and guess the song from short previews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
       <body
        className="font-sans antialiased"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,185,84,0.18), transparent 70%), #0a0a0c",
        }}
      >
        {children}
      </body>
    </html>
  );
}
