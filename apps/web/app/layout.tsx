import type { Metadata } from "next";
import { Titlebar } from "@corvus/ui";
import { AuthGuard } from "@/components/auth";
import { BRAND_DESCRIPTION } from "@/lib/brand";
import "./globals.css";

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
    <html lang="en" className="dark">
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden">
        <Titlebar />
        <main className="flex-1 min-h-0 flex flex-col">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </body>
    </html>
  );
}
