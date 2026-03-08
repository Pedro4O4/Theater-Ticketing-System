import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./App.css";
import { AuthProvider } from "@/auth/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Event Tix - Book Your Magic",
  description: "Experience the magic of live performance with easy booking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <LanguageProvider>
            <div className="app-container">
              <Navbar />
              <div className="navbar-spacer"></div>
              <main className="main-content">
                {children}
              </main>
              <Footer />
              <ToastContainer
                position="top-right"
                autoClose={5000}
                theme="dark"
              />
            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
