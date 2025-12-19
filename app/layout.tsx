import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DocChat Pro - AI-Powered Document Chat",
    template: "%s | DocChat Pro",
  },
  description: "Chat with your documents using AI. Upload PDFs, TXT, and DOCX files and get instant answers powered by GPT-4. Start free, upgrade to Pro for unlimited access.",
  keywords: ["AI", "document chat", "GPT-4", "document analysis", "SaaS", "RAG", "PDF chat", "document Q&A"],
  authors: [{ name: "DocChat Pro" }],
  creator: "DocChat Pro",
  publisher: "DocChat Pro",
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://docchat-pro.vercel.app'),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXTAUTH_URL || 'https://docchat-pro.vercel.app',
    siteName: "DocChat Pro",
    title: "DocChat Pro - AI-Powered Document Chat",
    description: "Chat with your documents using AI. Upload documents and get instant answers powered by GPT-4.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DocChat Pro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DocChat Pro - AI-Powered Document Chat",
    description: "Chat with your documents using AI. Upload documents and get instant answers powered by GPT-4.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
