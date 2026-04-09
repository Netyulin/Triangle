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
      {/* 上方文案 — Issue 2: 价值导向 */}
      <p className="text-center text-sm text-muted-foreground mb-3">
        正在准备高速下载通道，请稍候
      </p>

      {/* 倒计时圆环 — 桌面120px / 移动100px（设计文档 Section 4.2） */}
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

      {/* 状态文案 */}
      <p className="text-center text-muted-foreground mb-4 text-sm">
        {isReady ? '下载已准备就绪，即将跳转...' : `将在 ${clampedRemaining} 秒后开始跳转`}
      </p>

      {/* 立即下载按钮 */}
      <button
        className={cn(
          'admin-primary-btn w-full justify-center flex transition-all',
          !isReady && 'opacity-60 cursor-not-allowed pointer-events-none'
        )}
        onClick={handleSkip}
        disabled={!isReady}
      >
        立即下载 {softwareName}
      </button>

      {/* 下方文案 — Issue 2: 引导会员 */}
      <p className="text-center text-xs text-muted-foreground/60 mt-3">
        嫌弃等待？
        <a
          href={membershipUrl}
          className="text-accent hover:underline ml-1"
        >
          赞助会员即刻直达
        </a>
      </p>
    </div>
  );
}
