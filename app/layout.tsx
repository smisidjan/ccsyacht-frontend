import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Papertrail Marine by CCS Yacht",
  description: "Papertrail Marine by CCS Yacht - Professional yacht coating inspection management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
