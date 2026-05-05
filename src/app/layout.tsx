import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Learning App",
  description: "A free English learning app for all levels.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
