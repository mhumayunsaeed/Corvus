import type { Metadata } from "next";
import { Titlebar } from "@veyra/ui";
import { AuthGuard } from "@/components/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veyra",
  description: "Where your world connects.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-dvh flex-col overflow-hidden">
        <Titlebar />
        <main className="flex-1 min-h-0 flex flex-col">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </body>
    </html>
  );
}
