import SplashScreen from "@/components/SplashScreen";
import AuthSessionListener from "@/components/auth/AuthSessionListener";
import AppFooter from "@/components/ui/AppFooter";
import CancioneroSyncRunner from "@/components/offline/CancioneroSyncRunner";
import OfflinePrefetchRunner from "@/components/offline/OfflinePrefetchRunner";
import OfflineWarmRunner from "@/components/offline/OfflineWarmRunner";
import SerwistProvider from "@/components/offline/SerwistProvider";
import NavigationProgressProvider from "@/components/ui/NavigationProgress";
import TapFeedbackProvider from "@/components/ui/TapFeedbackProvider";
import { APP_SHELL_BG } from "@/lib/splash-theme";
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
  themeColor: APP_SHELL_BG,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${font.variable} splash-active h-full antialiased`}
      style={{ backgroundColor: APP_SHELL_BG }}
    >
      <head>
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true){localStorage.setItem("pwa-installed-v1","1");localStorage.setItem("pwa-ever-standalone-v1","1");}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="flex min-h-full flex-col"
        style={{ backgroundColor: APP_SHELL_BG }}
      >
        <div
          id="inline-splash"
          className="splash-screen fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ backgroundColor: APP_SHELL_BG }}
          role="status"
          aria-live="polite"
          aria-label="Cargando CantemosTodos"
        >
          <div className="flex flex-col items-center gap-8">
            <div className="splash-logo-wrap relative flex items-center justify-center">
              <div className="splash-glow" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt=""
                width={160}
                height={160}
                className="splash-logo relative z-10 size-40"
                fetchPriority="high"
              />
            </div>
            <div
              className="splash-eq flex items-end justify-center gap-1.5"
              aria-hidden="true"
            >
              {[0, 1, 2, 3, 4].map((index) => (
                <span
                  key={index}
                  className="splash-eq-bar"
                  style={{ animationDelay: `${index * 0.12}s` }}
                />
              ))}
            </div>
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-accent/20"
            aria-hidden="true"
          >
            <div className="splash-progress-bar h-full w-1/3 bg-accent" />
          </div>
        </div>
        <SerwistProvider>
          <TapFeedbackProvider>
            <Suspense fallback={null}>
              <NavigationProgressProvider>
                <CancioneroSyncRunner />
                <OfflinePrefetchRunner />
                <OfflineWarmRunner />
                <AuthSessionListener />
                <SplashScreen />
                {children}
                <AppFooter />
              </NavigationProgressProvider>
            </Suspense>
          </TapFeedbackProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
