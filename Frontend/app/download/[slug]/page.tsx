'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';
import DownloadCountdown from '@/components/download/DownloadCountdown';
import DownloadSkeleton from '@/components/download/DownloadSkeleton';
import { ADSENSE_SLOT_IDS, DEFAULT_ADSENSE_SLOT_TOGGLES, fetchAdSenseSlotToggles, fetchDownloadInfo } from '@/lib/api';
import type { DownloadInfo } from '@/lib/api';

export default function DownloadInterstitialPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adSwitches, setAdSwitches] = useState(DEFAULT_ADSENSE_SLOT_TOGGLES);

  useEffect(() => {
    if (!slug) return;

    async function loadData() {
      try {
        const info = await fetchDownloadInfo(slug);
        setDownloadInfo(info);
      } catch (err) {
        console.error('Failed to load download info:', err);
        setError('加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  useEffect(() => {
    let active = true;
    const loadAdSwitches = async () => {
      const toggles = await fetchAdSenseSlotToggles();
      if (!active) return;
      setAdSwitches(toggles);
    };
    void loadAdSwitches();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container-custom py-8 md:py-12">
          <div className="flex justify-center py-20">
            <DownloadSkeleton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !downloadInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container-custom py-8 md:py-12">
          <Link
            href={`/software/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回软件详情
          </Link>
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">{error || '软件不存在'}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // redirectUrl：后端已计算好最终 CPS 跳转目标（优先 affiliateLink，否则 downloadUrl）
  const redirectUrl = downloadInfo.affiliateLink || downloadInfo.downloadUrl || '';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* 中间页主体 — 垂直居中布局（设计文档 Section 4.2） */}
      <main className="container-custom flex flex-col items-center justify-center py-12 md:py-16">
        {/* 返回链接 */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2">
          <Link
            href={`/software/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回软件详情
          </Link>
        </div>

        {/* 垂直居中内容区 */}
        <div className="mt-16 flex w-full max-w-md flex-col items-center gap-6 md:mt-0">
          {/* 品牌标识 — Issue 3: 信任信号（设计文档） */}
          <div className="flex items-center gap-2">
            <TriangleLogo />
            <span className="text-sm font-semibold text-foreground">Triangle</span>
          </div>

          {/* App Icon — 80px 居中（设计文档 Section 4.2） */}
          <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            {downloadInfo.heroImage || downloadInfo.icon ? (
              <img
                src={downloadInfo.heroImage || downloadInfo.icon || ''}
                alt={downloadInfo.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                无图片
              </div>
            )}
          </div>

          {/* App Name + Version */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">{downloadInfo.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">v{downloadInfo.version}</p>
          </div>

          {/* AdSense 中间广告 — 320x100 水平广告，居中（设计文档 Section 4.2） */}
          <div className="w-full max-w-sm">
            {ADSENSE_SLOT_IDS.triangle_download_interstitial && adSwitches.triangle_download_interstitial ? (
              <AdSenseSlot
                slotId={ADSENSE_SLOT_IDS.triangle_download_interstitial}
                width={320}
                height={100}
                format="horizontal"
                isInterstitial={true}
              />
            ) : (
              <div className="flex h-[100px] w-full max-w-sm items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground/60">AdSense 占位</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/40">
                    设置 NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT_ID
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 倒计时组件 */}
          <Suspense fallback={<DownloadSkeleton />}>
            <DownloadCountdown
              seconds={5}
              redirectUrl={redirectUrl}
              softwareName={downloadInfo.name}
              membershipUrl="/membership"
            />
          </Suspense>
        </div>

        {/* 底部链接 */}
        <div className="mt-16 space-x-4 text-center text-sm text-muted-foreground">
          <a href="/report" className="hover:text-accent transition-colors">举报广告</a>
          <a href="/copyright" className="hover:text-accent transition-colors">侵权投诉</a>
          <a href="/about" className="hover:text-accent transition-colors">关于我们</a>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function TriangleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L2 19H22L12 2Z"
        fill="rgb(var(--accent))"
        stroke="rgb(var(--accent))"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
