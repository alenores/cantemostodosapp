import { getSalaMainFooterPaddingCss } from "@/lib/sala-layout";

export default function CancioneroLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app"
      style={{ height: "100dvh", paddingBottom: getSalaMainFooterPaddingCss() }}
    >
      {children}
    </div>
  );
}
