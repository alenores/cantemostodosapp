type LetraViewerProps = {
  url: string;
  title?: string;
};

export default function LetraViewer({
  url,
  title = "Previsualización de letra",
}: LetraViewerProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-letra-bg">
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
