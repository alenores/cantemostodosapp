type LetraViewerProps = {
  url: string;
  title?: string;
  edgeToEdge?: boolean;
};

export default function LetraViewer({
  url,
  title = "Previsualización de letra",
  edgeToEdge = false,
}: LetraViewerProps) {
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-letra-bg ${
        edgeToEdge ? "" : "rounded-[12px]"
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
