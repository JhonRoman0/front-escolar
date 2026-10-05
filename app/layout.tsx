import type { Metadata } from "next";
import { Geist_Mono, DM_Sans, Raleway, Inter } from "next/font/google";

import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";
import { cn } from "@/lib/utils";

const ralewayHeading = Raleway({ subsets: ["latin"], variable: "--font-heading" });

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"], variable: "--font-sidebar" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Sistema Escolar",
  description: "Sistema de Gestión Escolar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        dmSans.variable,
        ralewayHeading.variable,
        inter.variable,
        "font-sans"
      )}
    >
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
        <Toaster richColors />
      </body>
    </html>
  );
}