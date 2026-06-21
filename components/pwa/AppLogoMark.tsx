import Image from "next/image";
import { PWA_HOME_ICON_SRC } from "@/lib/pwa-home-label";

type AppLogoMarkProps = {
  size?: number;
  className?: string;
};

export default function AppLogoMark({ size = 44, className = "" }: AppLogoMarkProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-dark ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={PWA_HOME_ICON_SRC}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
        aria-hidden
      />
    </span>
  );
}
