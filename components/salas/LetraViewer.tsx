type LetraViewerProps = {
  url: string;
};

export default function LetraViewer({ url }: LetraViewerProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-letra-bg">
      <iframe
        src={url}
        title="Previsualización de letra"
        className="size-full min-h-[280px] border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
