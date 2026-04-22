'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, Download } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';
import DownloadCountdown from '@/components/download/DownloadCountdown';
import DownloadSkeleton from '@/components/download/DownloadSkeleton';
import { ADSENSE_SLOT_IDS, DEFAULT_ADSENSE_SLOT_TOGGLES, fetchAdSenseSlotToggles, fetchDownloadInfo, request, type AppAccessPayload, type DownloadInfo } from '@/lib/api';
import { useAppContext } from '@/components/app-provider';

type DownloadLink = { name: string; url: string };

function accessMessage(reason: string) {
  if (reason === 'login required') return '登录后才能继续下载。';
  if (reason === 'membership not enough') return '当前会员等级不足，请先升级会员。';
  if (reason === 'daily quota exhausted') return '今日下载次数已达限制。';
  if (reason === 'download disabled') return '该软件当前暂时关闭下载。';
  return '当前暂时无法下载。';
}

function getMembershipRank(level?: string) {
  const normalized = String(level || '').trim().toLowerCase();
  if (normalized === 'supreme' || normalized === 'vip') return 3;
  if (normalized === 'lifetime' || normalized === 'premium') return 2;
  if (normalized === 'sponsor' || normalized === 'member') return 1;
  return 0;
}

export default function DownloadInterstitialPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { token } = useAppContext();

  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [accessInfo, setAccessInfo] = useState<AppAccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adSwitches, setAdSwitches] = useState(DEFAULT_ADSENSE_SLOT_TOGGLES);
  const [countdownReady, setCountdownReady] = useState(false);

  useEffect(() => {
    if (!slug) return;

    async function loadData() {
      setLoading(true);
      setError(null);
      setCountdownReady(false);

      try {
        const [info, access] = await Promise.all([
          fetchDownloadInfo(slug),
          request<AppAccessPayload>(`/api/apps/${slug}/access`, token ? { token } : {}),
        ]);
        setDownloadInfo(info);
        setAccessInfo(access);
      } catch (err) {
        console.error('Failed to load download info:', err);
        setError('下载信息加载失败，请稍后重试。');
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [slug, token]);

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

  const resolvedLinks = useMemo<DownloadLink[]>(() => {
    const links = accessInfo?.downloadLinks ?? [];
    if (links.length > 0) {
      return links;
    }

    const fallbackUrl = accessInfo?.downloadUrl || downloadInfo?.downloadUrl || '';
    if (!fallbackUrl) {
      return [];
    }

    return [{ name: '默认下载地址', url: fallbackUrl }];
  }, [accessInfo?.downloadLinks, accessInfo?.downloadUrl, downloadInfo?.downloadUrl]);

  const remainingDownloads = accessInfo?.userPermissions.remainingDownloads ?? 0;
  const isLimitReached = accessInfo?.downloadPermission.reason === 'daily quota exhausted';
  const skipCountdown = getMembershipRank(accessInfo?.userPermissions.membershipLevel) >= 1;
  const canDirectDownload = Boolean(accessInfo?.downloadPermission.allowed) && !isLimitReached && resolvedLinks.length > 0 && skipCountdown;
  const canShowCountdown = Boolean(accessInfo?.downloadPermission.allowed) && !isLimitReached && resolvedLinks.length > 0 && !skipCountdown;

  const handleLinkClick = (url: string) => {
    if (!countdownReady && !skipCountdown) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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

  if (error || !downloadInfo || !accessInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container-custom py-8 md:py-12">
          <Link href={`/software/${slug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回软件详情
          </Link>
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">{error || '该软件不存在或已下架。'}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container-custom flex flex-col items-center justify-center py-12 md:py-16">
        <div className="absolute left-1/2 top-4 -translate-x-1/2">
          <Link href={`/software/${slug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回软件详情
          </Link>
        </div>

        <div className="mt-16 flex w-full max-w-2xl flex-col items-center gap-6 md:mt-0">
          <div className="flex items-center gap-2">
            <TriangleLogo />
            <span className="text-sm font-semibold text-foreground">三角软件</span>
          </div>

          <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            {downloadInfo.heroImage || downloadInfo.icon ? (
              <Image
                src={downloadInfo.heroImage || downloadInfo.icon || ''}
                alt={downloadInfo.name}
                width={80}
                height={80}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">暂无图片</div>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">{downloadInfo.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">v{downloadInfo.version}</p>
          </div>

          {isLimitReached ? (
            <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-center justify-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                今日下载数已达限制
              </div>
              <p className="mt-2">
                今日已下载 {accessInfo.userPermissions.downloadCountDaily} 次，剩余 {remainingDownloads} 次。
              </p>
            </div>
          ) : canShowCountdown ? (
            <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mx-auto flex w-full max-w-md flex-col items-center">
                <DownloadCountdown seconds={5} softwareName={downloadInfo.name} onComplete={() => setCountdownReady(true)} />
              </div>

              <div className="mx-auto mt-6 w-full max-w-md space-y-3 text-center">
                <p className="text-center text-sm text-muted-foreground">
                  倒计时结束前，下面的下载地址会保持不可点击。
                </p>
                <div className="grid gap-3">
                  {resolvedLinks.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => handleLinkClick(item.url)}
                      disabled={!countdownReady}
                      className="inline-flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{item.name}</span>
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <Download className="h-3.5 w-3.5" />
                        {countdownReady ? '点击下载' : '倒计时中'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : canDirectDownload ? (
            <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mx-auto w-full max-w-md space-y-4 text-center">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                  赞助会员及以上无需等待，可直接点击下载。
                </div>
                <div className="grid gap-3">
                  {resolvedLinks.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => handleLinkClick(item.url)}
                      className="inline-flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-secondary"
                    >
                      <span>{item.name}</span>
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <Download className="h-3.5 w-3.5" />
                        点击下载
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-2xl border border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">
              {accessMessage(accessInfo.downloadPermission.reason)}
            </div>
          )}

          {ADSENSE_SLOT_IDS.triangle_download_interstitial && adSwitches.triangle_download_interstitial && !skipCountdown ? (
            <AdSenseSlot
              slotId={ADSENSE_SLOT_IDS.triangle_download_interstitial}
              width={320}
              height={100}
              format="horizontal"
              isInterstitial={true}
            />
          ) : null}
        </div>

        <div className="mt-16 space-x-4 text-center text-sm text-muted-foreground">
          <a href="/report" className="hover:text-accent transition-colors">举报广告</a>
          <a href="/copyright" className="hover:text-accent transition-colors">版权投诉</a>
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
