import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "CampusGrieve — Report Issues Easily",
  description: "Simple grievance and maintenance tracker for students and staff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <Navbar />
        <div className="page-wrap">{children}</div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
