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

export const metadata: Metadata = {
  title: "Party History Timelapse — 3D Chronicle & Interactive Archive",
  description: "Spin through historical milestones in a 3D ring and drum wheel and upload new events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full antialiased dark`}
    >
      <head>
        {/* Flame Sword - https://www.cursors-4u.com/cursor/spo16-12 */}
        <link
          rel="stylesheet"
          href="https://cdn.cursors-4u.net/cursors/animated/spo16-12-c32099aa-32.css"
        />
        {/* End www.Cursors-4U.com Code */}
      </head>
      <body className="h-full w-full overflow-hidden bg-[#060010] text-foreground antialiased m-0 p-0">
        {children}
      </body>
    </html>
  );
}
