import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";
import "./globals.css";

const googleSans = Google_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SystemDraw",
  description: "Drag.Drop.Simulate Systems.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${googleSans.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
