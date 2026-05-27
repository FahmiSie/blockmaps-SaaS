import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import Providers from "~/providers";

export const metadata: Metadata = {
  title: "BlockMaps",
  description: "Industrial Distribution Management SaaS",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <TRPCReactProvider>
          <Providers>
            {children}
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}