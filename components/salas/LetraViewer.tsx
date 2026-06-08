type LetraViewerProps = {
  url: string;
  title?: string;
  edgeToEdge?: boolean;
  elevated?: boolean;
  minHeight?: string;
  fill?: boolean;
};

export default function LetraViewer({
  url,
  title = "Previsualización de letra",
  edgeToEdge = false,
  elevated = false,
  minHeight,
  fill = false,
}: LetraViewerProps) {
  return (
    <div
      style={minHeight ? { minHeight } : undefined}
      className={`flex w-full flex-col overflow-hidden bg-letra-bg ${
        fill ? "h-full min-h-0" : "h-full min-h-0 flex-1"
      } ${
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
        className={`block w-full border-0 ${
          fill ? "h-full min-h-0 flex-1" : "h-full min-h-0 flex-1"
        }`}
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
