import type { Metadata } from "next";
import AppNotifications from "@/components/AppNotifications";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP System",
  description: "Production, sales, inventory, and procurement workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-50 text-gray-900">
        <Navbar>{children}</Navbar>
        <AppNotifications />
      </body>
    </html>
  );
}
