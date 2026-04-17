'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DownloadCountdownProps {
  seconds: number;
  softwareName: string;
  onComplete?: () => void;
}

export default function DownloadCountdown({ seconds, softwareName, onComplete }: DownloadCountdownProps) {
  const [remaining, setRemaining] = useState(Math.max(seconds, 0));
  const completedRef = useRef(false);

  useEffect(() => {
    setRemaining(Math.max(seconds, 0));
    completedRef.current = false;
  }, [seconds, softwareName]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const timer = window.setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remaining, onComplete]);

  const safeSeconds = Math.max(seconds, 1);
  const clampedRemaining = Math.max(remaining, 0);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - clampedRemaining / safeSeconds);
  const isReady = clampedRemaining <= 0;

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center text-center">
      <p className="mb-3 text-sm text-muted-foreground">
        {isReady ? '倒计时已经结束，可以点击下面的下载地址。' : `正在准备 ${softwareName} 的下载地址，请稍等。`}
      </p>

      <div className="relative mb-4 h-[100px] w-[100px] md:h-[120px] md:w-[120px]">
        <svg className="h-full w-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgb(var(--muted))" strokeWidth="4" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className="transition-all duration-1000 ease-linear"
          />
          <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="bold" fill="rgb(var(--foreground))">
            {clampedRemaining}
          </text>
        </svg>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all duration-1000 ease-linear"
          style={{ width: `${((safeSeconds - clampedRemaining) / safeSeconds) * 100}%` }}
        />
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {isReady ? '现在可以点击下方按钮下载。' : `还需要等待 ${clampedRemaining} 秒。`}
      </p>

      <button
        className={cn(
          'w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-accent-foreground transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 disabled:cursor-not-allowed',
          !isReady && 'pointer-events-none cursor-not-allowed opacity-60',
        )}
        disabled={!isReady}
      >
        等待完成
      </button>
    </div>
  );
}
