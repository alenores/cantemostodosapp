type LetraViewerProps = {
  url: string;
  title?: string;
  edgeToEdge?: boolean;
  elevated?: boolean;
  minHeight?: string;
  height?: string;
};

export default function LetraViewer({
  url,
  title = "Previsualización de letra",
  edgeToEdge = false,
  elevated = false,
  minHeight,
  height,
}: LetraViewerProps) {
  const containerStyle = height
    ? { height }
    : minHeight
      ? { minHeight }
      : undefined;

  return (
    <div
      style={containerStyle}
      className={`flex flex-col overflow-hidden bg-letra-bg ${
        edgeToEdge ? "" : "rounded-[12px]"
      } ${height || minHeight ? "min-h-0" : "min-h-[320px]"} ${
        elevated
          ? "h-full min-h-0 flex-1 border-2 border-dashed border-accent/85 shadow-[0_10px_40px_rgba(0,0,0,0.48),0_4px_12px_rgba(0,0,0,0.28)]"
          : ""
      }`}
    >
      <iframe
        src={url}
        title={title}
        className="block h-full w-full min-h-0 flex-1 border-0"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
