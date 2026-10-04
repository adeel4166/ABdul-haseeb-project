import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { LedgerProvider } from "@/lib/ledger-context";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Abroad Fund",
  description: "A private desk for the rupee account you are filling before going abroad.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="h-dvh overflow-hidden">
        <LedgerProvider>
          <AppShell>{children}</AppShell>
        </LedgerProvider>
      </body>
    </html>
  );
}
