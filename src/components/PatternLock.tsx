import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PatternLockProps {
  onComplete: (pattern: number[]) => void;
  disabled?: boolean;
  errorMessage?: string | null;
  label?: string;
  onClear?: () => void;
}

// 3x3 Grid center coordinates in percentage (0..100)
const DOT_COORDS = [
  { x: 16.66, y: 16.66 }, { x: 50, y: 16.66 }, { x: 83.33, y: 16.66 },
  { x: 16.66, y: 50 },    { x: 50, y: 50 },    { x: 83.33, y: 50 },
  { x: 16.66, y: 83.33 }, { x: 50, y: 83.33 }, { x: 83.33, y: 83.33 },
];

export const PatternLock: React.FC<PatternLockProps> = ({
  onComplete,
  disabled = false,
  errorMessage,
  label,
  onClear,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);

  // Check if pointer position hits an unselected dot
  const checkDotCollision = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * 100;
    const relY = ((clientY - rect.top) / rect.height) * 100;

    // Radius collision threshold in percentage (~14% of container size)
    const threshold = 14;

    DOT_COORDS.forEach((dot, index) => {
      const dx = relX - dot.x;
      const dy = relY - dot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < threshold) {
        setSelectedDots((prev) => {
          if (!prev.includes(index)) {
            return [...prev, index];
          }
          return prev;
        });
      }
    });

    setPointerPos({ x: relX, y: relY });
  }, []);

  const handlePointerDown = (dotIndex: number, e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    setSelectedDots([dotIndex]);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * 100;
      const relY = ((e.clientY - rect.top) / rect.height) * 100;
      setPointerPos({ x: relX, y: relY });
    }
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDragging || disabled) return;
      checkDotCollision(e.clientX, e.clientY);
    };

    const handleGlobalPointerUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      setPointerPos(null);

      if (selectedDots.length > 0) {
        onComplete(selectedDots);
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
      window.addEventListener('pointercancel', handleGlobalPointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isDragging, disabled, checkDotCollision, selectedDots, onComplete]);

  const handleClear = () => {
    setSelectedDots([]);
    setPointerPos(null);
    if (onClear) onClear();
  };

  return (
    <div className="flex flex-col items-center space-y-3 w-full max-w-[280px] mx-auto select-none touch-none">
      {label && <p className="text-xs font-semibold text-zinc-300 text-center">{label}</p>}

      {/* 3x3 Grid Container */}
      <div
        ref={containerRef}
        className={`relative w-64 h-64 bg-zinc-950/80 border border-cyan-500/30 rounded-3xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden transition-all ${
          errorMessage ? 'border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''
        }`}
      >
        {/* SVG Overlay for Connecting Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="patternLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Render Lines Between Selected Dots */}
          {selectedDots.map((dotIdx, i) => {
            if (i === 0) return null;
            const prevDot = DOT_COORDS[selectedDots[i - 1]];
            const currDot = DOT_COORDS[dotIdx];
            return (
              <line
                key={`line-${i}`}
                x1={`${prevDot.x}%`}
                y1={`${prevDot.y}%`}
                x2={`${currDot.x}%`}
                y2={`${currDot.y}%`}
                stroke="url(#patternLineGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#cyanGlow)"
              />
            );
          })}

          {/* Render Live Line to Cursor while dragging */}
          {isDragging && selectedDots.length > 0 && pointerPos && (
            <line
              x1={`${DOT_COORDS[selectedDots[selectedDots.length - 1]].x}%`}
              y1={`${DOT_COORDS[selectedDots[selectedDots.length - 1]].y}%`}
              x2={`${pointerPos.x}%`}
              y2={`${pointerPos.y}%`}
              stroke="#22d3ee"
              strokeWidth="3"
              strokeDasharray="4 4"
              strokeLinecap="round"
              opacity="0.8"
            />
          )}
        </svg>

        {/* Render 3x3 Dots */}
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full relative z-20">
          {DOT_COORDS.map((coord, index) => {
            const isSelected = selectedDots.includes(index);
            const selectedOrder = selectedDots.indexOf(index);

            return (
              <div key={index} className="flex items-center justify-center relative">
                <button
                  type="button"
                  onPointerDown={(e) => handlePointerDown(index, e)}
                  disabled={disabled}
                  aria-label={`Pattern Dot ${index + 1}`}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 ${
                    isSelected
                      ? 'bg-cyan-400 border-2 border-white shadow-[0_0_18px_#22d3ee] scale-110'
                      : 'bg-zinc-900/90 border border-zinc-700/80 hover:border-cyan-500/50 hover:bg-zinc-800'
                  }`}
                >
                  <div
                    className={`rounded-full transition-all ${
                      isSelected ? 'w-3.5 h-3.5 bg-black' : 'w-3 h-3 bg-zinc-500'
                    }`}
                  />
                </button>

                {/* Number Badge order for drawn pattern */}
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] font-black flex items-center justify-center shadow-md pointer-events-none">
                    {selectedOrder + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear Button */}
      {selectedDots.length > 0 && !isDragging && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-zinc-400 hover:text-cyan-400 underline font-medium transition-colors pt-1"
        >
          Reset Pattern
        </button>
      )}
    </div>
  );
};
