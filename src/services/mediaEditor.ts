// ============================================================================
// MEDIA EDITOR SERVICE - CAPACITOR-READY ABSTRACTION LAYER
// Handles canvas composition, cropping, drawing, text, emojis, and color adjustments.
// // TODO: Capacitor native swap point -> Swap with @capacitor-community/image-editor or native image processing module
// ============================================================================

export interface CropRect {
  x: number; // percentage 0..1 or absolute px
  y: number;
  width: number;
  height: number;
}

export interface ColorAdjustments {
  brightness: number; // 50..150, default 100
  contrast: number; // 50..150, default 100
  saturation: number; // 0..200, default 100
  exposure: number; // -50..50, default 0
  warmth: number; // -50..50, default 0
  highlights: number; // -50..50, default 0
  shadows: number; // -50..50, default 0
}

export interface DrawStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  isEraser?: boolean;
}

export interface TextElement {
  id: string;
  text: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  color: string;
  size: number; // font size in px on reference canvas
  rotation: number; // deg
  align?: 'left' | 'center' | 'right';
}

export interface EmojiElement {
  id: string;
  emoji: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  size: number; // font size px
  rotation: number; // deg
}

export interface RenderLayersInput {
  imageSrc: string;
  crop?: CropRect | null; // normalized 0..1 or null
  adjustments: ColorAdjustments;
  strokes: DrawStroke[];
  texts: TextElement[];
  emojis: EmojiElement[];
}

export const MediaEditorService = {
  // Crop image bitmap and return cropped data URL
  // // TODO: Capacitor native swap point -> Delegate crop processing to native image processor
  async cropImage(imageSrc: string, crop: CropRect): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!crop || (crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1)) {
        resolve(imageSrc);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const nw = img.naturalWidth || img.width || 800;
          const nh = img.naturalHeight || img.height || 600;

          const cx = Math.max(0, Math.floor(crop.x * nw));
          const cy = Math.max(0, Math.floor(crop.y * nh));
          const cw = Math.max(1, Math.min(nw - cx, Math.floor(crop.width * nw)));
          const ch = Math.max(1, Math.min(nh - cy, Math.floor(crop.height * nh)));

          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }

          ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(err);
      img.src = imageSrc;
    });
  },

  // Composite all layers onto a high-resolution HTML5 Canvas
  // // TODO: Capacitor native swap point -> Delegate rendering to native mobile bitmap pipeline
  async renderLayersToDataUrl(input: RenderLayersInput): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width || 1200;
          const originalHeight = img.naturalHeight || img.height || 800;

          // 1. Calculate Crop Box in native dimensions
          const cropX = input.crop ? Math.max(0, input.crop.x * originalWidth) : 0;
          const cropY = input.crop ? Math.max(0, input.crop.y * originalHeight) : 0;
          const cropW = input.crop ? Math.min(originalWidth - cropX, input.crop.width * originalWidth) : originalWidth;
          const cropH = input.crop ? Math.min(originalHeight - cropY, input.crop.height * originalHeight) : originalHeight;

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(10, Math.round(cropW));
          canvas.height = Math.max(10, Math.round(cropH));
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }

          // 2. Apply Color Adjustments via CSS filter string on Canvas Context
          const brightness = input.adjustments.brightness; // e.g. 100
          const contrast = input.adjustments.contrast; // e.g. 100
          const saturate = input.adjustments.saturation; // e.g. 100
          const exposureOffset = (input.adjustments.exposure || 0) * 0.5;
          const totalBrightness = Math.max(10, brightness + exposureOffset);

          ctx.filter = `brightness(${totalBrightness}%) contrast(${contrast}%) saturate(${saturate}%)`;

          // Draw cropped base image
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

          // Reset filter for vector overlays (Draw, Text, Emoji)
          ctx.filter = 'none';

          // 3. Draw Strokes Layer
          if (input.strokes && input.strokes.length > 0) {
            input.strokes.forEach((stroke) => {
              if (stroke.points.length < 2) return;
              ctx.save();
              ctx.beginPath();
              ctx.lineWidth = stroke.size * (canvas.width / 800);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';

              if (stroke.isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
              } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = stroke.color;
              }

              // Points are normalized 0..1 relative to crop area
              const startX = stroke.points[0].x * canvas.width;
              const startY = stroke.points[0].y * canvas.height;
              ctx.moveTo(startX, startY);

              for (let i = 1; i < stroke.points.length; i++) {
                const px = stroke.points[i].x * canvas.width;
                const py = stroke.points[i].y * canvas.height;
                ctx.lineTo(px, py);
              }
              ctx.stroke();
              ctx.restore();
            });
          }

          // 4. Draw Text Elements Layer
          if (input.texts && input.texts.length > 0) {
            input.texts.forEach((textItem) => {
              ctx.save();
              const tx = textItem.x * canvas.width;
              const ty = textItem.y * canvas.height;
              const scaleFactor = canvas.width / 800;
              const fontSize = Math.max(12, textItem.size * scaleFactor);

              ctx.translate(tx, ty);
              if (textItem.rotation) {
                ctx.rotate((textItem.rotation * Math.PI) / 180);
              }

              ctx.font = `bold ${fontSize}px sans-serif`;
              ctx.fillStyle = textItem.color;
              ctx.textAlign = textItem.align || 'center';
              ctx.textBaseline = 'middle';

              // Text shadow for legibility
              ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
              ctx.shadowBlur = 6;
              ctx.shadowOffsetX = 2;
              ctx.shadowOffsetY = 2;

              ctx.fillText(textItem.text, 0, 0);
              ctx.restore();
            });
          }

          // 5. Draw Emoji Elements Layer
          if (input.emojis && input.emojis.length > 0) {
            input.emojis.forEach((emojiItem) => {
              ctx.save();
              const ex = emojiItem.x * canvas.width;
              const ey = emojiItem.y * canvas.height;
              const scaleFactor = canvas.width / 800;
              const fontSize = Math.max(16, emojiItem.size * scaleFactor);

              ctx.translate(ex, ey);
              if (emojiItem.rotation) {
                ctx.rotate((emojiItem.rotation * Math.PI) / 180);
              }

              ctx.font = `${fontSize}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              ctx.fillText(emojiItem.emoji, 0, 0);
              ctx.restore();
            });
          }

          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (err) => reject(err);
      img.src = input.imageSrc;
    });
  },
};
