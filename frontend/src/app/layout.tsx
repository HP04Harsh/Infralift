import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PageTransition } from "@/components/layout/PageTransition";
import { RoutePreloader } from "@/components/RoutePreloader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Infralift - Azure Infrastructure Automation Platform",
  description: "Production-grade Azure automation platform for enterprise DevOps",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <RoutePreloader />
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
