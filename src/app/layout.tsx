import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavbarServer from "@/components/layout/NavbarServer";
import { SessionProvider } from 'next-auth/react';
import Footer from "@/components/layout/Footer";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "Ballotbox | Find Your Polling Place",
  description:
    "Hyper-local voter access dashboard — find your polling place, hours, and voting options in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none"
        >
          Skip to content
        </a>
        <NavbarServer />
        <SessionProvider>
          <main id="main-content">{children}</main>
          </SessionProvider>
        <Footer />
      </body>
    </html>
  );
}
