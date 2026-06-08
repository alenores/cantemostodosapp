type LetraViewerProps = {
  url: string;
  title?: string;
  edgeToEdge?: boolean;
  elevated?: boolean;
};

export default function LetraViewer({
  url,
  title = "Previsualización de letra",
  edgeToEdge = false,
  elevated = false,
}: LetraViewerProps) {
  return (
    <div
      className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-letra-bg ${
        edgeToEdge ? "" : "rounded-[12px]"
      } ${elevated ? "shadow-[0_6px_28px_rgba(0,0,0,0.38)]" : ""}`}
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
