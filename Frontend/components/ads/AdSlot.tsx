'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface AdSlotConfig {
  id: string;
  type: 'banner' | 'insertion' | 'native' | 'splash';
  position: 'top' | 'bottom' | 'sidebar' | 'infeed';
  size?: { width: number; height: number };
  refreshInterval?: number;
  lazyLoad?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

interface AdContentData {
  id: string;
  slotId: string;
  title: string;
  description?: string;
  imageUrl: string;
  ctaText: string;
  targetUrl: string;
  advertiser: string;
}

interface AdSlotProps {
  slot: AdSlotConfig;
  fallback?: React.ReactNode;
  adContent?: AdContentData | null;
  onAdClick?: (adId: string, slotId: string) => void;
}

export function AdSlot({ slot, fallback, adContent, onAdClick }: AdSlotProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!slot.lazyLoad || !slotRef.current) {
      setIsLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(slotRef.current);
    return () => observer.disconnect();
  }, [slot.lazyLoad]);

  const handleAdClick = () => {
    if (adContent && onAdClick) {
      onAdClick(adContent.id, slot.id);
    }
  };

  if (!isClient) {
    return <AdSkeleton slot={slot} />;
  }

  if (!adContent && !isLoaded) {
    return <AdSkeleton slot={slot} />;
  }

  if (!adContent) {
    return <div className="ad-fallback">{fallback}</div>;
  }

  return (
    <div
      ref={slotRef}
      className={cn(
        'ad-slot relative overflow-hidden transition-all duration-300',
        'border border-border rounded-lg',
        slot.type === 'banner' ? 'w-full' : 'max-w-full',
        slot.type === 'splash' ? 'fixed inset-0 z-50' : '',
        slot.type === 'native' ? 'bg-background' : 'bg-card',
        slot.type === 'insertion' ? 'card-custom' : 'shadow-card hover:shadow-hover'
      )}
      data-slot-id={slot.id}
      style={
        slot.size
          ? {
              width: slot.size.width,
              height: slot.size.height,
            }
          : {}
      }
    >
      <a
        href={adContent.targetUrl}
        className="block w-full h-full"
        onClick={handleAdClick}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="relative w-full h-[60%] overflow-hidden rounded-t-lg">
          <img
            src={adContent.imageUrl}
            alt={adContent.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
            {adContent.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {adContent.description}
          </p>

          <button
            className="btn btn-primary w-full active:scale-95 transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            {adContent.ctaText}
          </button>
        </div>
      </a>
    </div>
  );
}

function AdSkeleton({ slot }: { slot: AdSlotConfig }) {
  return (
    <div
      className={cn(
        'ad-skeleton animate-pulse border border-border rounded-lg',
        slot.size ? `w-[${slot.size.width}px] h-[${slot.size.height}px]` : 'w-full h-40',
        slot.type === 'native' ? 'bg-background' : 'bg-card'
      )}
    >
      <div className="w-full h-2/3 bg-muted rounded-t-lg" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
        <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
        <div className="h-9 bg-muted-foreground/20 rounded w-full" />
      </div>
    </div>
  );
}

export type { AdSlotConfig, AdContentData };
