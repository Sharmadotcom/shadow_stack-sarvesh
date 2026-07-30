"use client";

import "./globals.css";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "demo-google-client-id.apps.googleusercontent.com";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>CampusGrieve — Redressal & Maintenance System</title>
        <meta name="description" content="Grievance redressal, SLA tracking, priority escalation and maintenance system for students, workers, and admin." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <Navbar />
            <div className="page-wrap">{children}</div>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
