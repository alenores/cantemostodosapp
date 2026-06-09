import SplashScreen from "@/components/SplashScreen";
import NavigationProgressProvider from "@/components/ui/NavigationProgress";
import TapFeedbackProvider from "@/components/ui/TapFeedbackProvider";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-app",
});

export const metadata: Metadata = {
  title: "CantemosTodos",
  description: "Letras en tiempo real para reuniones musicales con amigos",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "CanToApp",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#232323",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${font.variable} h-full antialiased`}>
      <head>
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <TapFeedbackProvider>
          <Suspense fallback={null}>
            <NavigationProgressProvider>
              <SplashScreen />
              {children}
            </NavigationProgressProvider>
          </Suspense>
        </TapFeedbackProvider>
      </body>
    </html>
  );
}
