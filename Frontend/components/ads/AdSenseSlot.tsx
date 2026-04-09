'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

// Google AdSense publisher ID — 替换为你的实际 ca-pub-XXXXX
export const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || 'ca-pub-7143421934912272';

interface AdSenseSlotProps {
  slotId: string;
  width?: number | 'auto';
  height?: number;
  format?: 'auto' | 'fluid' | 'horizontal' | 'vertical' | 'rectangle';
  layout?: string;
  className?: string;
  /** 仅 interstitial（中间页）使用 */
  isInterstitial?: boolean;
}

type AdState = 'idle' | 'loading' | 'loaded' | 'error';

export function AdSenseSlot({
  slotId,
  width = 'auto',
  height = 90,
  format = 'auto',
  layout,
  className,
  isInterstitial = false,
}: AdSenseSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<AdState>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const scriptInitialized = useRef(false);

  // 动态加载 AdSense 脚本
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initAds = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adsbygoogle = (window as any).adsbygoogle || [];
        if (adsbygoogle.loaded === true) {
          // 脚本已加载，触发广告请求
          if (containerRef.current && !scriptInitialized.current) {
            scriptInitialized.current = true;
            adsbygoogle.push({});
          }
          setState('loading');
        }
      } catch {
        setState('error');
      }
    };

    // 检查脚本是否已存在
    const existingScript = document.querySelector(
      `script[src*="googlesyndication.com/pagead/js/adsbygoogle.js"]`
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        // 等待 adsbygoogle 初始化
        setTimeout(initAds, 100);
      };
      script.onerror = () => setState('error');
      document.head.appendChild(script);
    } else {
      initAds();
    }

    // 监听广告加载成功
    const handleAdLoad = () => setState('loaded');
    window.addEventListener('adsense:load', handleAdLoad);
    return () => window.removeEventListener('adsense:load', handleAdLoad);
  }, []);

  // 广告失败重试一次
  useEffect(() => {
    if (state === 'error' && retryCount === 0) {
      const timer = setTimeout(() => {
        scriptInitialized.current = false;
        setRetryCount(1);
        setState('idle');
        // 重新触发
        if (containerRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const adsbygoogle = (window as any).adsbygoogle || [];
          adsbygoogle.push({});
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, retryCount]);

  // IntersectionObserver：懒加载
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          if (state === 'idle' && !scriptInitialized.current) {
            scriptInitialized.current = true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const adsbygoogle = (window as any).adsbygoogle || [];
            adsbygoogle.push({});
            setState('loading');
          }
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [state]);

  return (
    <div className={cn('relative', className)}>
      {/* 广告标签 */}
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px] text-muted-foreground tracking-wide">广告</span>
        <GoogleIcon />
      </div>

      {/* 广告容器 — 1A 规范：虚线边框 + 最小高度占位 */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-900/50',
          state === 'error' || state === 'idle' ? 'min-h-[90px]' : 'min-h-[90px]',
          isInterstitial ? 'w-full' : 'w-full'
        )}
      >
        {/* 真实 AdSense 广告位 */}
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: width === 'auto' ? '100%' : `${width}px`,
            height: `${height}px`,
          }}
          data-ad-client={`${ADSENSE_PUBLISHER_ID}`}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-ad-layout={layout}
          data-ad-channel={isInterstitial ? 'interstitial' : undefined}
        />

        {/* 加载中骨架屏 */}
        {(state === 'loading' || state === 'idle') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {state === 'error' && retryCount > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">广告加载失败</span>
              <span className="text-[10px] text-muted-foreground/60">
                {retryCount > 0 ? '已重试' : '将自动重试'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="h-3 w-3 text-muted-foreground/60"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
        fill="currentColor"
      />
    </svg>
  );
}

export default AdSenseSlot;
