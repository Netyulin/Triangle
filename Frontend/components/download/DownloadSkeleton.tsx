'use client';

export default function DownloadSkeleton() {
  return (
    <div className="w-full max-w-xs mt-4 animate-pulse">
      <div className="relative w-20 h-20 mx-auto mb-4">
        <div className="w-full h-full rounded-full border-4 border-muted" />
      </div>

      <div className="h-4 bg-muted rounded w-48 mx-auto mb-4" />

      <div className="h-12 bg-muted rounded-xl w-full" />
    </div>
  );
}
