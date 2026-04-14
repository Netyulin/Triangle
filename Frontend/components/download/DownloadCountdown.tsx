'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface DownloadCountdownProps {
  seconds: number;
  /** CPS 跳转链接（affiliateLink），倒计时结束后自动跳转 */
  redirectUrl: string;
  softwareName: string;
  /** 赞助会员链接（可选） */
  membershipUrl?: string;
  /** 倒计时结束回调 */
  onComplete?: () => void;
  /** 跳过按钮回调（保留用于兼容性） */
  onSkip?: () => void;
}

export default function DownloadCountdown({
  seconds,
  redirectUrl,
  softwareName,
  membershipUrl = '/membership',
  onComplete,
  onSkip,
}: DownloadCountdownProps) {
  const [remaining, setRemaining] = useState(Math.max(seconds, 0));
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (redirected) {
      return;
    }

    if (remaining <= 0) {
      setRemaining(0);
      setRedirected(true);
      onComplete?.();
      // 倒计时结束 → 自动跳转联盟链接
      window.location.href = redirectUrl;
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, redirected, redirectUrl, onComplete]);

  const handleSkip = () => {
    if (!redirected && remaining <= 0) {
      onSkip?.();
      setRedirected(true);
      window.location.href = redirectUrl;
    }
  };

  const clampedRemaining = Math.max(remaining, 0);
  const safeSeconds = Math.max(seconds, 1);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - clampedRemaining / safeSeconds);
  const isReady = clampedRemaining <= 0;

  return (
    <div className="w-full max-w-xs">
      {/* 上方文案 */}
      <p className="mb-3 text-center text-sm text-muted-foreground">
        正在准备高速下载通道，请稍候
      </p>

      {/* 倒计时圆环 + 进度条 */}
      <div className="relative mx-auto mb-4 h-[100px] w-[100px] md:h-[120px] md:w-[120px]">
        <svg className="h-full w-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(var(--muted))"
            strokeWidth="4"
          />
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
          <text
            x="50"
            y="55"
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill="rgb(var(--foreground))"
          >
            {clampedRemaining}
          </text>
        </svg>
      </div>

      {/* 进度条 — 增强视觉反馈 */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all duration-1000 ease-linear"
          style={{ width: `${((safeSeconds - clampedRemaining) / safeSeconds) * 100}%` }}
        />
      </div>

      {/* 状态文案 */}
      <p className="mb-4 text-center text-sm text-muted-foreground">
        {isReady ? '下载已准备就绪，即将跳转...' : `将在 ${clampedRemaining} 秒后开始跳转`}
      </p>

      {/* 立即下载按钮 — 增强设计 */}
      <button
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-accent-foreground transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 disabled:cursor-not-allowed',
          !isReady && 'opacity-60 cursor-not-allowed pointer-events-none'
        )}
        onClick={handleSkip}
        disabled={!isReady}
      >
        <Download className="h-4 w-4" />
        立即下载 {softwareName}
      </button>

      {/* 下方文案 */}
      <p className="mt-3 text-center text-xs text-muted-foreground/60">
        不想等待？
        <a
          href={membershipUrl}
          className="ml-1 text-accent hover:underline"
        >
          赞助会员即刻直达
        </a>
      </p>
    </div>
  );
}

function Download(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}
