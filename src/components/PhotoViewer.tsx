import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Heart,
  Share2,
  Edit3,
  Trash2,
  Info,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
} from 'lucide-react';
import { MediaItem, ThemeConfig } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { LazyThumb } from './LazyThumb';

interface Props {
  media: MediaItem | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToVault: (id: string) => void;
  onOpenEditor: (media: MediaItem) => void;
  onOpenCompressor: (media: MediaItem) => void;
  onOpenVideoPlayer: (media: MediaItem) => void;
  onShare: (media: MediaItem) => void;
  theme: ThemeConfig;
}

export const PhotoViewer: React.FC<Props> = ({
  media,
  onClose,
  onNext,
  onPrev,
  onToggleFavorite,
  onDelete,
  onMoveToVault,
  onOpenEditor,
  onOpenCompressor,
  onOpenVideoPlayer,
  onShare,
  theme,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Smooth Zooming & Panning State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);
  // Swipe-to-navigate (next/prev) tracking -- only active when not zoomed in,
  // so pinch/pan still works normally once the user has zoomed.
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // Reset zoom whenever media changes or opens
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    if (slideDirection) {
      const t = setTimeout(() => setSlideDirection(null), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.id]);

  if (!media) return null;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleShare = () => {
    if (media) onShare(media);
  };

  // Double-tap zoom toggle
  const handleDoubleTap = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(5, prev + 0.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, prev - 0.5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Touch handlers for Pinch-to-Zoom & Panning
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      initialTouchDistanceRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    } else if (e.touches.length === 1 && scale === 1) {
      swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const factor = dist / initialTouchDistanceRef.current;
      const newScale = Math.min(5, Math.max(1, initialScaleRef.current * factor));
      setScale(newScale);
    } else if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    initialTouchDistanceRef.current = null;
    isDraggingRef.current = false;

    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || scale !== 1) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const SWIPE_THRESHOLD = 55;
    const TAP_THRESHOLD = 18;

    // Mostly-horizontal swipe past the threshold navigates; anything more
    // vertical or too short is ignored so it doesn't fight with scrolling.
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0) {
        setSlideDirection('left');
        onNext();
      } else {
        setSlideDirection('right');
        onPrev();
      }
    } else if (Math.abs(deltaX) < TAP_THRESHOLD && Math.abs(deltaY) < TAP_THRESHOLD) {
      // A tap on the photo itself (not a swipe, not a drag) -- toggle the
      // name/share/edit/swipe UI, same as tapping anywhere else on screen.
      setShowControls((prev) => !prev);
    }
  };

  // Tapping the photo with a mouse (desktop/web preview) also toggles the
  // overlay UI, same as a touch tap -- but only when it wasn't the end of a
  // pan drag while zoomed in.
  const handleContentClick = () => {
    if (isDraggingRef.current || scale !== 1) return;
    setShowControls((prev) => !prev);
  };

  // Mouse drag panning for desktop when zoomed
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale > 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current && scale > 1) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden ${theme.viewerBg}`}>
      {/* Background Overlay */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={() => setShowControls((prev) => !prev)}
      />

      {/* Main Photo View Area */}
      <div
        key={media.id}
        className={`relative w-full h-full flex items-center justify-center p-2 sm:p-6 z-10 touch-none cursor-grab active:cursor-grabbing ${
          slideDirection === 'left' ? 'viewer-slide-left' : slideDirection === 'right' ? 'viewer-slide-right' : ''
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleContentClick}
      >
        {media.type === 'video' ? (
          <div className="relative max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl flex flex-col items-center justify-center">
            <LazyThumb item={media} alt={media.title} className="max-h-[70vh] max-w-full aspect-video" />
            <button
              onClick={() => onOpenVideoPlayer(media)}
              className="absolute px-6 py-3 rounded-2xl font-bold bg-white text-black shadow-2xl hover:scale-105 transition-transform"
            >
              <span>Play Video</span>
            </button>
          </div>
        ) : (
          <div
            className="relative max-w-5xl max-h-[85vh] flex items-center justify-center transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            }}
            onDoubleClick={handleDoubleTap}
          >
            <img
              src={media.url}
              alt={media.title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl pointer-events-none"
            />
          </div>
        )}
      </div>

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="absolute top-16 z-50 px-4 py-2 rounded-xl bg-cyan-500 text-black font-semibold text-xs shadow-xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* TOP BAR OVERLAY */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
                onClose();
              }}
              className="p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                {media.title}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {media.date} • {media.sizeMb.toFixed(1)} MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowInfo((prev) => !prev)}
              className={`p-2 rounded-full transition-all ${
                showInfo ? 'bg-cyan-500 text-black' : 'bg-black/60 text-white hover:bg-white/20'
              }`}
              title="Photo Details (EXIF)"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION BAR */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
          <div className="max-w-xl mx-auto flex items-center justify-around py-2 px-3 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-2xl">
            {/* Favorite */}
            <button
              onClick={() => {
                onToggleFavorite(media.id);
                triggerToast(media.isFavorite ? 'Removed from favorites' : 'Added to favorites ❤️');
              }}
              className="flex flex-col items-center gap-1 text-[10px] font-medium text-zinc-300 hover:text-white"
            >
              <Heart
                className={`w-5 h-5 ${
                  media.isFavorite ? 'text-red-500 fill-red-500 scale-110' : 'text-zinc-300'
                }`}
              />
              <span>Favorite</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1 text-[10px] font-medium text-zinc-300 hover:text-white"
            >
              <Share2 className="w-5 h-5 text-cyan-400" />
              <span>Share</span>
            </button>

            {/* Edit (Crop/Draw/Text/Emoji/Adjust) */}
            <button
              onClick={() => onOpenEditor(media)}
              className="flex flex-col items-center gap-1 text-[10px] font-medium text-zinc-300 hover:text-white"
            >
              <Edit3 className="w-5 h-5 text-emerald-400" />
              <span>Edit</span>
            </button>

            {/* Move to Private Vault */}
            <button
              onClick={() => {
                onMoveToVault(media.id);
                triggerToast('Moved to Private Vault 🔒');
              }}
              className="flex flex-col items-center gap-1 text-[10px] font-medium text-zinc-300 hover:text-white"
            >
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <span>Vault</span>
            </button>

            {/* Delete with Confirmation Modal */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex flex-col items-center gap-1 text-[10px] font-medium text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-5 h-5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* EXIF INFO DRAWER */}
      {showInfo && (
        <div className="absolute bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-30 p-4 rounded-2xl bg-zinc-950/95 border border-zinc-800 backdrop-blur-2xl text-white space-y-2 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Media Information</h4>
            <button onClick={() => setShowInfo(false)}>
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          <div className="text-xs space-y-1.5 font-mono text-zinc-300">
            <div className="flex justify-between">
              <span className="text-zinc-500">File Name:</span>
              <span className="truncate max-w-[160px]">{media.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Date:</span>
              <span>{media.date} {media.time || ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">File Size:</span>
              <span>{media.sizeMb.toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Album:</span>
              <span>{media.album}</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          onDelete(media.id);
          onClose();
        }}
        title="Delete Photo?"
        message="This photo will be removed from your storage and moved to the Recycle Bin, where it'll stay for 30 days before being permanently deleted."
      />
    </div>
  );
};
