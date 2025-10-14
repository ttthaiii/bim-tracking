import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/context/AuthContext'; // Import AuthProvider
import PageLayout from '@/components/shared/PageLayout'; // Import PageLayout
import { DashboardProvider } from '@/context/DashboardContext';
import { FirestoreCacheProvider } from '@/contexts/FirestoreCacheContext'; // Import FirestoreCacheProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BIM Tracking - Project Management System",
  description: "Track and manage your BIM projects efficiently. Monitor progress, assign tasks, and collaborate with your team in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider> {/* Wrap children with AuthProvider */}
          <DashboardProvider>
            <FirestoreCacheProvider> {/* Wrap children with FirestoreCacheProvider */}
              <PageLayout> {/* Wrap children with PageLayout */}
                {children}
              </PageLayout>
            </FirestoreCacheProvider>
          </DashboardProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
