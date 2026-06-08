import { GIT_COMMIT_SHA } from "@/lib/build-info";

export default function BuildVersionFooter() {
  return (
    <footer className="px-4 pb-4 pt-2">
      <p className="text-center text-[10px] text-text-faint opacity-60">
        {GIT_COMMIT_SHA}
      </p>
    </footer>
  );
}
