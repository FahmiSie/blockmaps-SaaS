import "@/styles/globals.css";

import { type Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "BlockMaps — Industrial Logistics Operating System",
  description:
    "Visual warehouse management & internal distribution control for industrial facilities.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${geistMono.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
