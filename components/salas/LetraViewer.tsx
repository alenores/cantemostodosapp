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
  if (fill) {
    return (
      <div
        className={`relative h-full w-full overflow-hidden bg-letra-bg ${
          edgeToEdge ? "" : "rounded-[12px]"
        }`}
      >
        <iframe
          src={url}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  const containerStyle = minHeight ? { minHeight } : undefined;

  return (
    <div
      style={containerStyle}
      className={`flex min-h-0 flex-col overflow-hidden bg-letra-bg ${
        edgeToEdge ? "" : "rounded-[12px]"
      } ${elevated ? "h-full min-h-0 flex-1" : "min-h-[320px]"} ${
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
