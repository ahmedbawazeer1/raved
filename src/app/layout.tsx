import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "رفد — منصة المسارات التعليمية لطلاب اليمن",
    template: "%s · رفد",
  },
  description:
    "منصة تعليمية مجانية لطلاب الثانوية في اليمن. مسارات واضحة تبدأ من الصفر وتعمل حتى بلا إنترنت، أولها الإنجليزية حتى الشهادة الدولية.",
  applicationName: "رفد",
  appleWebApp: { capable: true, title: "رفد", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0E6E5C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${inter.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <SerwistProvider
          swUrl="/serwist/sw.js"
          options={{ scope: "/" }}
          disable={process.env.NODE_ENV === "development"}
        >
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
