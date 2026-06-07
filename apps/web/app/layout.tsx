import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Space_Grotesk } from "next/font/google";
import { Titlebar, ThemeProvider, ThemeScript } from "@corvus/ui";
import { AuthGuard } from "@/components/auth";
import { BRAND_DESCRIPTION } from "@/lib/brand";
import "./globals.css";

// Expressive display face for headings, brand moments, and empty states.
const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Corvus",
  description: BRAND_DESCRIPTION,
  icons: {
    icon: "/corvus-logo.png",
    shortcut: "/corvus-logo.png",
    apple: "/corvus-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className={`dark ${displayFont.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript defaultTheme="dark" />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden">
        <ThemeProvider defaultTheme="dark">
          <Titlebar />
          <main className="flex-1 min-h-0 flex flex-col">
            <AuthGuard>{children}</AuthGuard>
          </main>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
