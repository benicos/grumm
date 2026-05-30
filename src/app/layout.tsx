import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/config/app";
import { getSiteUrl } from "@/lib/serverMetadata";
import AnalyticsProvider from "./components/AnalyticsProvider";
import { AuthProvider } from "./auth/AuthProvider";
import {
  BrowserErrorInstrumentation,
  GlobalErrorBoundary,
} from "./components/ErrorInstrumentation";
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
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GlobalErrorBoundary>
          <BrowserErrorInstrumentation />
          <AuthProvider>
            <AnalyticsProvider>{children}</AnalyticsProvider>
          </AuthProvider>
          <Analytics />
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
