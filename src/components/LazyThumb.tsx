import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, ImageOff } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaService } from '../services/media';

type ThumbStatus = 'loading' | 'loaded' | 'failed';

// Loads a single item's real thumbnail only once it's actually scrolled into
// view, instead of the whole library generating/downloading thumbnails up
// front. This is what keeps scans fast and scrolling smooth, and it's what
// makes video thumbnails actually show up (a raw video file can't be used
// directly as an <img> source).
export const LazyThumb: React.FC<{ item: MediaItem; alt: string; className: string }> = React.memo(
  ({ item, alt, className }) => {
    const [src, setSrc] = useState<string>(item.thumbnailUrl || '');
    const [status, setStatus] = useState<ThumbStatus>(item.thumbnailUrl ? 'loaded' : 'loading');
    // True once we've fallen back to the item's original full-size file
    // (photos only) after the generated thumbnail failed. Kept separate from
    // `status` so the retry button can still distinguish "showing a
    // fallback" from "showing a real small thumbnail".
    const usedFullImageFallback = useRef(false);
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
      if (src) return; // already have a real thumbnail
      const el = ref.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: '400px 0px' } // start loading a bit before it's on screen
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, [src]);

    // requestId bumps whenever we want to (re)try loading, so a manual retry
    // tap can re-run this effect without needing to touch `inView`.
    const [requestId, setRequestId] = useState(0);

    useEffect(() => {
      if (!inView || src || item.mediaId == null) return;
      let cancelled = false;
      setStatus('loading');
      MediaService.getThumbnail(item.mediaId, item.type === 'video')
        .then((url) => {
          if (cancelled) return;
          if (url) {
            setSrc(url);
            setStatus('loaded');
            return;
          }
          throw new Error('empty thumbnail');
        })
        .catch(() => {
          if (cancelled) return;
          // Last resort for photos only: show the actual file instead of a
          // small generated thumbnail. It's heavier, but it's per-visible
          // tile only (never the whole library up front), so it doesn't
          // touch the scanning/scroll performance -- and it means a photo
          // still actually shows up even if thumbnail generation failed.
          if (item.type === 'photo' && item.url) {
            usedFullImageFallback.current = true;
            setSrc(item.url);
            setStatus('loaded');
          } else {
            setStatus('failed');
          }
        });
      return () => {
        cancelled = true;
        // If this tile scrolled out of the virtualized window (unmounted)
        // before its thumbnail request actually started, pull it back out
        // of the queue -- no point spending a concurrency slot generating
        // a thumbnail for something that's no longer on screen, and it
        // means whatever IS on screen right now gets that slot instead.
        MediaService.cancelThumbnailRequest(item.mediaId!, item.type === 'video');
      };
    }, [inView, src, item.mediaId, item.type, item.url, requestId]);

    const handleRetry = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      usedFullImageFallback.current = false;
      setSrc('');
      setStatus('loading');
      setRequestId((n) => n + 1);
    }, []);

    return (
      <div ref={ref} className={`${className} bg-white/5`}>
        {status === 'loaded' && src ? (
          <img src={src} alt={alt} decoding="async" loading="lazy" className="w-full h-full object-cover" />
        ) : status === 'failed' ? (
          // Videos: a plain play icon reads as "video, tap to open/retry"
          // instead of looking like a broken/error state -- this is how
          // other gallery apps handle a video whose thumbnail couldn't be
          // generated.
          <button
            type="button"
            onClick={handleRetry}
            className="w-full h-full flex items-center justify-center bg-white/5 text-white/40 active:text-white/70"
            title="Tap to retry"
          >
            {item.type === 'video' ? (
              <Play className="w-5 h-5 fill-current" />
            ) : (
              <ImageOff className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-full h-full animate-pulse bg-gradient-to-br from-white/5 to-white/10" />
        )}
      </div>
    );
  },
  (prev, next) => prev.item.id === next.item.id && prev.item.thumbnailUrl === next.item.thumbnailUrl
);
