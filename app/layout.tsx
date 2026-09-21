import AppLoadingSkeleton from "@/components/ui/AppLoadingSkeleton";
import SplashScreen from "@/components/SplashScreen";
import AuthSessionListener from "@/components/auth/AuthSessionListener";
import AppFooter from "@/components/ui/AppFooter";
import AppSidebar from "@/components/ui/AppSidebar";
import CancioneroSyncRunner from "@/components/offline/CancioneroSyncRunner";
import CancionesPracticaSyncRunner from "@/components/offline/CancionesPracticaSyncRunner";
import MisCancionesSyncRunner from "@/components/offline/MisCancionesSyncRunner";
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
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <div id="inline-splash"><AppLoadingSkeleton /></div>
        <SerwistProvider>
          <TapFeedbackProvider>
            <Suspense fallback={null}>
              <NavigationProgressProvider>
                <CancioneroSyncRunner>
                <CancionesPracticaSyncRunner />
                <MisCancionesSyncRunner />
                <OfflinePrefetchRunner />
                <OfflineWarmRunner />
                <AuthSessionListener />
                <SplashScreen />
                <AppSidebar />
                <div className="app-shell-main flex min-h-dvh w-full min-w-0 flex-1 flex-col overflow-x-clip">
                  {children}
                </div>
                <AppFooter />
                </CancioneroSyncRunner>
              </NavigationProgressProvider>
            </Suspense>
          </TapFeedbackProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
