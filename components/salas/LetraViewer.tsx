type LetraViewerProps = {
  url: string;
  title?: string;
  edgeToEdge?: boolean;
  elevated?: boolean;
  minHeight?: string;
};

export default function LetraViewer({
  url,
  title = "Previsualización de letra",
  edgeToEdge = false,
  elevated = false,
  minHeight,
}: LetraViewerProps) {
  return (
    <div
      style={minHeight ? { minHeight } : undefined}
      className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-letra-bg ${
        edgeToEdge ? "" : "rounded-[12px]"
      } ${
        elevated
          ? "border-2 border-dashed border-accent/85 shadow-[0_10px_40px_rgba(0,0,0,0.48),0_4px_12px_rgba(0,0,0,0.28)]"
          : ""
      }`}
    >
      <iframe
        src={url}
        title={title}
        className="size-full min-h-[320px] flex-1 border-0"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
