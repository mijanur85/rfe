import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Check,
  Crop as CropIcon,
  Pencil,
  Type,
  Smile,
  Sliders,
  Undo,
  Redo,
  RotateCcw,
  Trash2,
  Plus,
} from 'lucide-react';
import { MediaItem, ThemeConfig } from '../types';
import {
  MediaEditorService,
  ColorAdjustments,
  DrawStroke,
  TextElement,
  EmojiElement,
  CropRect,
} from '../services/mediaEditor';
import { MediaService } from '../services/media';

interface Props {
  media: MediaItem | null;
  onClose: () => void;
  onSave: (editedMedia: MediaItem) => void;
  theme: ThemeConfig;
}

type ToolType = 'crop' | 'draw' | 'text' | 'emoji' | 'adjust';

const EMOJI_LIST = [
  '😀', '😂', '😎', '😍', '✨', '🔥', '❤️', '🌟',
  '🎉', '📸', '👑', '🌈', '⚡', '🎯', '🌺', '☀️',
  '🍕', '💯', '📌', '🏆', '🚀', '💬', '💎', '💡',
  '🎨', '🎵', '🌊', '🌸', '💖', '🐱', '🐶', '👍',
];

const COLOR_PALETTE = [
  '#ffffff', '#00f3ff', '#ef4444', '#f59e0b',
  '#10b981', '#ec4899', '#000000', '#8b5cf6', '#3b82f6',
];

interface EditorState {
  imageSrc: string;
  adjustments: ColorAdjustments;
  strokes: DrawStroke[];
  texts: TextElement[];
  emojis: EmojiElement[];
}

export const PhotoEditorModal: React.FC<Props> = ({ media, onClose, onSave, theme }) => {
  const [activeTool, setActiveTool] = useState<ToolType>('crop');

  // CENTRALIZED EDITOR STATE & HISTORY (PAST, PRESENT, FUTURE)
  const [present, setPresent] = useState<EditorState>(() => ({
    imageSrc: media?.url || '',
    adjustments: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      exposure: 0,
      warmth: 0,
      highlights: 0,
      shadows: 0,
    },
    strokes: [],
    texts: [],
    emojis: [],
  }));

  const [past, setPast] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);

  // PUSH NEW HISTORY STATE
  const pushState = (nextPresent: EditorState) => {
    setPast((p) => [...p, present]);
    setPresent(nextPresent);
    setFuture([]); // Clear future stack on new edit
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture((f) => [present, ...f]);
    setPresent(previous);
    setPast((p) => p.slice(0, p.length - 1));
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, present]);
    setPresent(next);
    setFuture((f) => f.slice(1));
  };

  // CROP STATE
  const [cropAspect, setCropAspect] = useState<'free' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16'>('free');
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // DRAW STATE
  const [brushColor, setBrushColor] = useState('#00f3ff');
  const [brushSize, setBrushSize] = useState(12);
  const [isEraser, setIsEraser] = useState(false);
  const currentStrokeRef = useRef<DrawStroke | null>(null);

  // TEXT STATE
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newTextInput, setNewTextInput] = useState('My Text');

  // EMOJI STATE
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(null);

  // REFS & CONTAINER SIZING
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // DRAG REFS FOR TEXT & EMOJI & CROP
  const dragInfoRef = useRef<{
    pointerId: number;
    type: 'text' | 'emoji' | 'crop';
    id?: string;
    handle?: string;
    startX: number;
    startY: number;
    initialPos: { x: number; y: number; w?: number; h?: number };
    containerWidth: number;
    containerHeight: number;
    hasMoved: boolean;
  } | null>(null);

  if (!media) return null;

  // Sync canvas size with image rendered size & draw strokes
  const syncCanvasAndDraw = () => {
    if (!drawCanvasRef.current || !imgRef.current) return;
    const canvas = drawCanvasRef.current;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();

    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);

      // Re-draw all strokes from present state
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        present.strokes.forEach((stroke) => {
          if (stroke.points.length === 0) return;
          ctx.save();
          ctx.beginPath();
          ctx.lineWidth = stroke.size;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (stroke.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
          }

          const startX = stroke.points[0].x * canvas.width;
          const startY = stroke.points[0].y * canvas.height;
          ctx.moveTo(startX, startY);

          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
          }
          ctx.stroke();
          ctx.restore();
        });
      }
    }
  };

  useEffect(() => {
    syncCanvasAndDraw();
  }, [present.strokes, present.imageSrc, activeTool]);

  // CROP PRESET ASPECT RATIOS
  const getRatioValue = (ratio: 'free' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16'): number => {
    switch (ratio) {
      case '1:1': return 1.0;
      case '4:3': return 4 / 3;
      case '16:9': return 16 / 9;
      case '3:4': return 3 / 4;
      case '9:16': return 9 / 16;
      default: return 1.0;
    }
  };

  const handleSelectAspect = (ratio: 'free' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16') => {
    setCropAspect(ratio);
    if (ratio === 'free') {
      setCropRect({ x: 0, y: 0, width: 1, height: 1 });
      return;
    }

    const targetRatio = getRatioValue(ratio);
    const imgRatio = imageNaturalSize ? imageNaturalSize.width / imageNaturalSize.height : 1;
    const normalizedRatio = targetRatio / imgRatio;

    let w = 0.8;
    let h = 0.8;

    if (normalizedRatio <= 1) {
      w = 0.8 * normalizedRatio;
      h = 0.8;
    } else {
      w = 0.8;
      h = 0.8 / normalizedRatio;
    }

    const x = Math.max(0, (1 - w) / 2);
    const y = Math.max(0, (1 - h) / 2);
    setCropRect({ x, y, width: w, height: h });
  };

  // APPLY CROP
  const handleApplyCrop = async () => {
    if (cropRect.x === 0 && cropRect.y === 0 && cropRect.width === 1 && cropRect.height === 1) {
      return;
    }
    setIsProcessing(true);
    try {
      const croppedUrl = await MediaEditorService.cropImage(present.imageSrc, cropRect);
      const newPresent: EditorState = {
        ...present,
        imageSrc: croppedUrl,
      };
      setCropRect({ x: 0, y: 0, width: 1, height: 1 });
      setCropAspect('free');
      pushState(newPresent);
    } catch (err) {
      console.error('Failed to crop image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetCrop = () => {
    setCropRect({ x: 0, y: 0, width: 1, height: 1 });
    setCropAspect('free');
  };

  // ADD TEXT
  const handleAddText = () => {
    if (!newTextInput.trim()) return;
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      text: newTextInput,
      x: 0.5,
      y: 0.5,
      color: brushColor,
      size: 32,
      rotation: 0,
      align: 'center',
    };
    const newPresent = {
      ...present,
      texts: [...present.texts, newText],
    };
    setSelectedTextId(newText.id);
    setNewTextInput('');
    pushState(newPresent);
  };

  // ADD EMOJI
  const handleAddEmoji = (emojiChar: string) => {
    const newEmoji: EmojiElement = {
      id: `emoji-${Date.now()}`,
      emoji: emojiChar,
      x: 0.5,
      y: 0.5,
      size: 48,
      rotation: 0,
    };
    const newPresent = {
      ...present,
      emojis: [...present.emojis, newEmoji],
    };
    setSelectedEmojiId(newEmoji.id);
    pushState(newPresent);
  };

  // POINTER DRAGGING FOR TEXT
  const handleTextPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTextId(id);
    setSelectedEmojiId(null);
    setActiveTool('text');

    const textItem = present.texts.find((t) => t.id === id);
    if (!textItem || !imgRef.current) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = imgRef.current.getBoundingClientRect();

    dragInfoRef.current = {
      pointerId: e.pointerId,
      type: 'text',
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialPos: { x: textItem.x, y: textItem.y },
      containerWidth: rect.width,
      containerHeight: rect.height,
      hasMoved: false,
    };
  };

  // POINTER DRAGGING FOR EMOJI
  const handleEmojiPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedEmojiId(id);
    setSelectedTextId(null);
    setActiveTool('emoji');

    const emojiItem = present.emojis.find((em) => em.id === id);
    if (!emojiItem || !imgRef.current) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = imgRef.current.getBoundingClientRect();

    dragInfoRef.current = {
      pointerId: e.pointerId,
      type: 'emoji',
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialPos: { x: emojiItem.x, y: emojiItem.y },
      containerWidth: rect.width,
      containerHeight: rect.height,
      hasMoved: false,
    };
  };

  const handlePointerMoveGlobal = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfoRef.current || dragInfoRef.current.pointerId !== e.pointerId) return;

    const drag = dragInfoRef.current;
    const dx = (e.clientX - drag.startX) / drag.containerWidth;
    const dy = (e.clientY - drag.startY) / drag.containerHeight;

    if (Math.abs(e.clientX - drag.startX) > 3 || Math.abs(e.clientY - drag.startY) > 3) {
      drag.hasMoved = true;
    }

    if (drag.type === 'text') {
      const newX = Math.max(0.05, Math.min(0.95, drag.initialPos.x + dx));
      const newY = Math.max(0.05, Math.min(0.95, drag.initialPos.y + dy));
      setPresent((prev) => ({
        ...prev,
        texts: prev.texts.map((t) => (t.id === drag.id ? { ...t, x: newX, y: newY } : t)),
      }));
    } else if (drag.type === 'emoji') {
      const newX = Math.max(0.05, Math.min(0.95, drag.initialPos.x + dx));
      const newY = Math.max(0.05, Math.min(0.95, drag.initialPos.y + dy));
      setPresent((prev) => ({
        ...prev,
        emojis: prev.emojis.map((em) => (em.id === drag.id ? { ...em, x: newX, y: newY } : em)),
      }));
    }
  };

  const handlePointerUpGlobal = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfoRef.current && dragInfoRef.current.pointerId === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (dragInfoRef.current.hasMoved) {
        // Commit position change to history
        pushState(present);
      }
      dragInfoRef.current = null;
    }
  };

  // CROP BOX DRAGGING & RESIZING
  const handleCropHandlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    handle: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialCrop = { ...cropRect };

    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();

    const onPointerMove = (moveEv: PointerEvent) => {
      const dx = (moveEv.clientX - startX) / rect.width;
      const dy = (moveEv.clientY - startY) / rect.height;

      setCropRect(() => {
        let nx = initialCrop.x;
        let ny = initialCrop.y;
        let nw = initialCrop.width;
        let nh = initialCrop.height;

        const minSize = 0.1;

        if (handle === 'move') {
          nx = Math.max(0, Math.min(1 - nw, initialCrop.x + dx));
          ny = Math.max(0, Math.min(1 - nh, initialCrop.y + dy));
        } else {
          if (handle.includes('e')) {
            nw = Math.max(minSize, Math.min(1 - initialCrop.x, initialCrop.width + dx));
          }
          if (handle.includes('w')) {
            const possibleW = initialCrop.width - dx;
            if (possibleW >= minSize && initialCrop.x + dx >= 0) {
              nx = initialCrop.x + dx;
              nw = possibleW;
            }
          }
          if (handle.includes('s')) {
            nh = Math.max(minSize, Math.min(1 - initialCrop.y, initialCrop.height + dy));
          }
          if (handle.includes('n')) {
            const possibleH = initialCrop.height - dy;
            if (possibleH >= minSize && initialCrop.y + dy >= 0) {
              ny = initialCrop.y + dy;
              nh = possibleH;
            }
          }

          if (cropAspect !== 'free' && imageNaturalSize) {
            const targetRatio = getRatioValue(cropAspect);
            const imgRatio = imageNaturalSize.width / imageNaturalSize.height;

            const desiredW = nh * (targetRatio / imgRatio);
            if (nx + desiredW <= 1) {
              nw = desiredW;
            } else {
              nw = 1 - nx;
              nh = nw * (imgRatio / targetRatio);
            }
          }
        }

        return { x: nx, y: ny, width: nw, height: nh };
      });
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture(upEv.pointerId);
      } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // DRAWING POINTER HANDLERS
  const handleDrawPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'draw' || !drawCanvasRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = drawCanvasRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    currentStrokeRef.current = {
      id: `stroke-${Date.now()}`,
      points: [{ x: normX, y: normY }],
      color: brushColor,
      size: brushSize,
      isEraser,
    };
  };

  const handleDrawPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStrokeRef.current || !drawCanvasRef.current) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    currentStrokeRef.current.points.push({ x: normX, y: normY });

    // Live draw on canvas
    const ctx = drawCanvasRef.current.getContext('2d');
    if (ctx) {
      const w = drawCanvasRef.current.width;
      const h = drawCanvasRef.current.height;
      const points = currentStrokeRef.current.points;
      if (points.length >= 2) {
        ctx.beginPath();
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isEraser) {
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = brushColor;
        }

        const p1 = points[points.length - 2];
        const p2 = points[points.length - 1];
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    }
  };

  const handleDrawPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (currentStrokeRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}

      const completedStroke = currentStrokeRef.current;
      currentStrokeRef.current = null;

      const newPresent = {
        ...present,
        strokes: [...present.strokes, completedStroke],
      };
      pushState(newPresent);
    }
  };

  // SAVE FINAL COMPOSITED IMAGE
  // Writes the result as a real file on the device (Pictures/Neo Gallery
  // Edits/) via MediaService.saveEditedImage instead of only keeping the
  // base64 render in app state -- that's what makes the edit survive an
  // app restart and show up in other gallery apps. Falls back to the old
  // data-URL-only item when running outside the native app (browser
  // preview), where there's no real device storage to write to.
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataUrl = await MediaEditorService.renderLayersToDataUrl({
        imageSrc: present.imageSrc,
        crop: null, // crop already applied if any
        adjustments: present.adjustments,
        strokes: present.strokes,
        texts: present.texts,
        emojis: present.emojis,
      });

      const persistResult = await MediaService.saveEditedImage(dataUrl, media.title);

      const editedMedia: MediaItem = persistResult.persisted
        ? {
            ...media,
            id: `native-${persistResult.mediaId}`,
            mediaId: persistResult.mediaId,
            rawPath: persistResult.rawPath,
            title: `${media.title} (Edited)`,
            url: persistResult.url || dataUrl,
            thumbnailUrl: persistResult.thumbnailUrl || dataUrl,
            album: 'Neo Gallery Edits',
            date: new Date().toISOString().split('T')[0],
          }
        : {
            ...media,
            id: `edited-${Date.now()}`,
            title: `${media.title} (Edited)`,
            url: dataUrl,
            thumbnailUrl: dataUrl,
            date: new Date().toISOString().split('T')[0],
          };

      onSave(editedMedia);
      onClose();
    } catch (err) {
      console.error('Failed to save edited media:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedText = present.texts.find((t) => t.id === selectedTextId);
  const selectedEmoji = present.emojis.find((e) => e.id === selectedEmojiId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white select-none">
      {/* Header Bar */}
      <div className="p-3 sm:p-4 flex items-center justify-between border-b border-zinc-800 bg-black/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-extrabold text-white">Photo Editor</h3>
        </div>

        {/* Undo / Redo & Save Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={past.length === 0}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 transition-all active:scale-95"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={future.length === 0}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 transition-all active:scale-95"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isProcessing}
            className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,243,255,0.4)] hover:bg-cyan-300 transition-all active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div
        className="flex-1 relative flex items-center justify-center p-4 bg-[#050505] overflow-hidden touch-none"
        onPointerMove={handlePointerMoveGlobal}
        onPointerUp={handlePointerUpGlobal}
      >
        <div ref={imgContainerRef} className="relative max-h-[60vh] max-w-full flex items-center justify-center">
          {/* Base Image */}
          <img
            ref={imgRef}
            src={present.imageSrc}
            onLoad={(e) => {
              setImageNaturalSize({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              });
              syncCanvasAndDraw();
            }}
            alt={media.title}
            className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl transition-all pointer-events-none select-none"
            style={{
              filter: `brightness(${present.adjustments.brightness + (present.adjustments.exposure || 0) * 0.5}%) contrast(${present.adjustments.contrast}%) saturate(${present.adjustments.saturation}%)`,
            }}
          />

          {/* CROP OVERLAY RECTANGLE */}
          {activeTool === 'crop' && (
            <div className="absolute inset-0 pointer-events-auto touch-none select-none">
              {/* Darkened Mask Surrounding Crop Box */}
              <div
                className="absolute bg-black/60 top-0 left-0 right-0 pointer-events-none"
                style={{ height: `${cropRect.y * 100}%` }}
              />
              <div
                className="absolute bg-black/60 bottom-0 left-0 right-0 pointer-events-none"
                style={{ height: `${(1 - cropRect.y - cropRect.height) * 100}%` }}
              />
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{
                  top: `${cropRect.y * 100}%`,
                  bottom: `${(1 - cropRect.y - cropRect.height) * 100}%`,
                  left: 0,
                  width: `${cropRect.x * 100}%`,
                }}
              />
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{
                  top: `${cropRect.y * 100}%`,
                  bottom: `${(1 - cropRect.y - cropRect.height) * 100}%`,
                  right: 0,
                  width: `${(1 - cropRect.x - cropRect.width) * 100}%`,
                }}
              />

              {/* Crop Rectangle Box */}
              <div
                onPointerDown={(e) => handleCropHandlePointerDown(e, 'move')}
                className="absolute border-2 border-cyan-400 cursor-move shadow-[0_0_20px_rgba(0,243,255,0.4)]"
                style={{
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`,
                }}
              >
                {/* Rule of Thirds Grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                  <div className="border-r border-b border-cyan-300" />
                  <div className="border-r border-b border-cyan-300" />
                  <div className="border-b border-cyan-300" />
                  <div className="border-r border-b border-cyan-300" />
                  <div className="border-r border-b border-cyan-300" />
                  <div className="border-b border-cyan-300" />
                  <div className="border-r border-cyan-300" />
                  <div className="border-r border-cyan-300" />
                  <div />
                </div>

                {/* Handles */}
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, 'nw')}
                  className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-cyan-400 border-2 border-black rounded-full cursor-nwse-resize z-20 shadow-md"
                />
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, 'ne')}
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-cyan-400 border-2 border-black rounded-full cursor-nesw-resize z-20 shadow-md"
                />
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, 'sw')}
                  className="absolute -bottom-2.5 -left-2.5 w-6 h-6 bg-cyan-400 border-2 border-black rounded-full cursor-nesw-resize z-20 shadow-md"
                />
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, 'se')}
                  className="absolute -bottom-2.5 -right-2.5 w-6 h-6 bg-cyan-400 border-2 border-black rounded-full cursor-nwse-resize z-20 shadow-md"
                />
              </div>
            </div>
          )}

          {/* Drawing Canvas Layer */}
          <canvas
            ref={drawCanvasRef}
            onPointerDown={handleDrawPointerDown}
            onPointerMove={handleDrawPointerMove}
            onPointerUp={handleDrawPointerUp}
            style={{ touchAction: 'none' }}
            className={`absolute inset-0 w-full h-full ${
              activeTool === 'draw' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
            }`}
          />

          {/* Interactive Text Layers */}
          {present.texts.map((item) => (
            <div
              key={item.id}
              onPointerDown={(e) => handleTextPointerDown(e, item.id)}
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                color: item.color,
                fontSize: `${item.size}px`,
                touchAction: 'none',
              }}
              className={`absolute cursor-grab active:cursor-grabbing font-bold select-none px-2 py-1 rounded transition-all z-30 ${
                selectedTextId === item.id ? 'ring-2 ring-cyan-400 bg-black/50 shadow-xl' : ''
              }`}
            >
              {item.text}
            </div>
          ))}

          {/* Interactive Emoji Layers */}
          {present.emojis.map((item) => (
            <div
              key={item.id}
              onPointerDown={(e) => handleEmojiPointerDown(e, item.id)}
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                fontSize: `${item.size}px`,
                touchAction: 'none',
              }}
              className={`absolute cursor-grab active:cursor-grabbing select-none transition-all z-30 ${
                selectedEmojiId === item.id ? 'ring-2 ring-cyan-400 rounded-full bg-black/50 p-1 shadow-xl' : ''
              }`}
            >
              {item.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* TOOL CONTROLS PANEL */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4">
        {/* 1. CROP CONTROLS */}
        {activeTool === 'crop' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold text-white uppercase tracking-wider">Crop Aspect Ratio</span>
              <button
                onClick={handleResetCrop}
                className="text-cyan-400 font-mono text-[11px] hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(['free', '1:1', '4:3', '16:9', '3:4', '9:16'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => handleSelectAspect(ratio)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                    cropAspect === ratio
                      ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.4)]'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  {ratio.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleResetCrop}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCrop}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,243,255,0.4)] hover:bg-cyan-300"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isProcessing ? 'Cropping...' : 'Apply Crop'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. DRAW CONTROLS */}
        {activeTool === 'draw' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase">Brush Size:</span>
                <span className="text-xs font-mono text-cyan-400">{brushSize}px</span>
              </div>
              <button
                onClick={() => setIsEraser(!isEraser)}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                  isEraser
                    ? 'bg-amber-400 text-black border-amber-400'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                }`}
              >
                {isEraser ? 'Eraser ON' : 'Use Eraser'}
              </button>
            </div>

            <input
              type="range"
              min={2}
              max={40}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setBrushColor(c);
                    setIsEraser(false);
                  }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    brushColor === c && !isEraser ? 'scale-125 border-white shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 3. TEXT CONTROLS */}
        {activeTool === 'text' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTextInput}
                onChange={(e) => setNewTextInput(e.target.value)}
                placeholder="Enter text..."
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:border-cyan-400 outline-none"
              />
              <button
                onClick={handleAddText}
                className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1 shadow-md"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {selectedText && (
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-400">Edit Text Element</span>
                  <button
                    onClick={() => {
                      const newPresent = {
                        ...present,
                        texts: present.texts.filter((t) => t.id !== selectedTextId),
                      };
                      setSelectedTextId(null);
                      pushState(newPresent);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Font Size: {selectedText.size}px</span>
                    <input
                      type="range"
                      min={16}
                      max={80}
                      value={selectedText.size}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPresent((prev) => ({
                          ...prev,
                          texts: prev.texts.map((t) => (t.id === selectedTextId ? { ...t, size: val } : t)),
                        }));
                      }}
                      onPointerUp={() => pushState(present)}
                      onTouchEnd={() => pushState(present)}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Rotation: {selectedText.rotation}°</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={selectedText.rotation}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPresent((prev) => ({
                          ...prev,
                          texts: prev.texts.map((t) => (t.id === selectedTextId ? { ...t, rotation: val } : t)),
                        }));
                      }}
                      onPointerUp={() => pushState(present)}
                      onTouchEnd={() => pushState(present)}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                {/* Text Color Picker */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-zinc-400">Color:</span>
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        const updated = {
                          ...present,
                          texts: present.texts.map((t) => (t.id === selectedTextId ? { ...t, color: c } : t)),
                        };
                        pushState(updated);
                      }}
                      className={`w-5 h-5 rounded-full border ${
                        selectedText.color === c ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. EMOJI CONTROLS */}
        {activeTool === 'emoji' && (
          <div className="space-y-3 animate-fade-in">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tap Emoji to Place</div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xl">
              {EMOJI_LIST.map((em) => (
                <button
                  key={em}
                  onClick={() => handleAddEmoji(em)}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-transform active:scale-125"
                >
                  {em}
                </button>
              ))}
            </div>

            {selectedEmoji && (
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-400">Edit Emoji Element</span>
                  <button
                    onClick={() => {
                      const newPresent = {
                        ...present,
                        emojis: present.emojis.filter((e) => e.id !== selectedEmojiId),
                      };
                      setSelectedEmojiId(null);
                      pushState(newPresent);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Emoji Size: {selectedEmoji.size}px</span>
                    <input
                      type="range"
                      min={20}
                      max={120}
                      value={selectedEmoji.size}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPresent((prev) => ({
                          ...prev,
                          emojis: prev.emojis.map((em) => (em.id === selectedEmojiId ? { ...em, size: val } : em)),
                        }));
                      }}
                      onPointerUp={() => pushState(present)}
                      onTouchEnd={() => pushState(present)}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Rotation: {selectedEmoji.rotation}°</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={selectedEmoji.rotation}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPresent((prev) => ({
                          ...prev,
                          emojis: prev.emojis.map((em) => (em.id === selectedEmojiId ? { ...em, rotation: val } : em)),
                        }));
                      }}
                      onPointerUp={() => pushState(present)}
                      onTouchEnd={() => pushState(present)}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. ADJUST CONTROLS */}
        {activeTool === 'adjust' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs animate-fade-in">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Brightness</span>
                <span>{present.adjustments.brightness}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={150}
                value={present.adjustments.brightness}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPresent((prev) => ({
                    ...prev,
                    adjustments: { ...prev.adjustments, brightness: val },
                  }));
                }}
                onPointerUp={() => pushState(present)}
                onTouchEnd={() => pushState(present)}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Contrast</span>
                <span>{present.adjustments.contrast}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={150}
                value={present.adjustments.contrast}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPresent((prev) => ({
                    ...prev,
                    adjustments: { ...prev.adjustments, contrast: val },
                  }));
                }}
                onPointerUp={() => pushState(present)}
                onTouchEnd={() => pushState(present)}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Saturation</span>
                <span>{present.adjustments.saturation}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                value={present.adjustments.saturation}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPresent((prev) => ({
                    ...prev,
                    adjustments: { ...prev.adjustments, saturation: val },
                  }));
                }}
                onPointerUp={() => pushState(present)}
                onTouchEnd={() => pushState(present)}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Exposure</span>
                <span>{present.adjustments.exposure}</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                value={present.adjustments.exposure}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPresent((prev) => ({
                    ...prev,
                    adjustments: { ...prev.adjustments, exposure: val },
                  }));
                }}
                onPointerUp={() => pushState(present)}
                onTouchEnd={() => pushState(present)}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Warmth</span>
                <span>{present.adjustments.warmth}</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                value={present.adjustments.warmth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPresent((prev) => ({
                    ...prev,
                    adjustments: { ...prev.adjustments, warmth: val },
                  }));
                }}
                onPointerUp={() => pushState(present)}
                onTouchEnd={() => pushState(present)}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Highlights</span>
                <span>{present.adjustments.highlights}</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                value={present.adjustments.highlights}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPresent((prev) => ({
                    ...prev,
                    adjustments: { ...prev.adjustments, highlights: val },
                  }));
                }}
                onPointerUp={() => pushState(present)}
                onTouchEnd={() => pushState(present)}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        )}

        {/* MAIN EDITING TOOLBAR */}
        <div className="grid grid-cols-5 gap-1 pt-2 border-t border-zinc-800/80">
          <button
            onClick={() => setActiveTool('crop')}
            className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeTool === 'crop'
                ? 'bg-cyan-400 text-black font-extrabold shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CropIcon className="w-4 h-4" />
            <span className="text-[10px]">Crop</span>
          </button>

          <button
            onClick={() => setActiveTool('draw')}
            className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeTool === 'draw'
                ? 'bg-cyan-400 text-black font-extrabold shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Pencil className="w-4 h-4" />
            <span className="text-[10px]">Draw</span>
          </button>

          <button
            onClick={() => setActiveTool('text')}
            className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeTool === 'text'
                ? 'bg-cyan-400 text-black font-extrabold shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            <span className="text-[10px]">Text</span>
          </button>

          <button
            onClick={() => setActiveTool('emoji')}
            className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeTool === 'emoji'
                ? 'bg-cyan-400 text-black font-extrabold shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smile className="w-4 h-4" />
            <span className="text-[10px]">Emoji</span>
          </button>

          <button
            onClick={() => setActiveTool('adjust')}
            className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeTool === 'adjust'
                ? 'bg-cyan-400 text-black font-extrabold shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="text-[10px]">Adjust</span>
          </button>
        </div>
      </div>
    </div>
  );
};
