import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Language } from '../types/book';
import { t } from '../services/i18n';

interface ImageViewerModalProps {
  src: string | null;
  language?: Language;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ src, language = 'uk', onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);
  const lastTapTimeRef = useRef<number>(0);

  useEffect(() => {
    if (src) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      lastPositionRef.current = { x: 0, y: 0 };
    }
  }, [src]);

  if (!src) return null;

  const clampScale = (val: number) => Math.min(Math.max(val, 1), 5);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => clampScale(prev + 0.5));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => {
      const next = clampScale(prev - 0.5);
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
        lastPositionRef.current = { x: 0, y: 0 };
      }
      return next;
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
    lastPositionRef.current = { x: 0, y: 0 };
  };

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();

    if (e.touches.length === 2) {
      setIsDragging(false);
      initialPinchDistanceRef.current = getDistance(e.touches);
      initialPinchScaleRef.current = scale;
      return;
    }

    if (e.touches.length === 1) {
      const now = Date.now();
      const timeDiff = now - lastTapTimeRef.current;

      // Double tap to toggle zoom
      if (timeDiff < 280 && timeDiff > 0) {
        if (scale > 1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
          lastPositionRef.current = { x: 0, y: 0 };
        } else {
          setScale(2.5);
        }
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX - lastPositionRef.current.x,
          y: e.touches[0].clientY - lastPositionRef.current.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();

    if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      const currentDistance = getDistance(e.touches);
      const ratio = currentDistance / initialPinchDistanceRef.current;
      const nextScale = clampScale(initialPinchScaleRef.current * ratio);
      setScale(nextScale);
      if (nextScale === 1) {
        setPosition({ x: 0, y: 0 });
        lastPositionRef.current = { x: 0, y: 0 };
      }
      return;
    }

    if (e.touches.length === 1 && isDragging && scale > 1) {
      const nextX = e.touches[0].clientX - dragStartRef.current.x;
      const nextY = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({ x: nextX, y: nextY });
      lastPositionRef.current = { x: nextX, y: nextY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length < 2) {
      initialPinchDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - lastPositionRef.current.x,
        y: e.clientY - lastPositionRef.current.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.stopPropagation();
    const nextX = e.clientX - dragStartRef.current.x;
    const nextY = e.clientY - dragStartRef.current.y;
    setPosition({ x: nextX, y: nextY });
    lastPositionRef.current = { x: nextX, y: nextY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.35 : -0.35;
    setScale((prev) => {
      const next = clampScale(prev + delta);
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
        lastPositionRef.current = { x: 0, y: 0 };
      }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
      onWheel={handleWheel}
    >
      {/* Top Controls Bar */}
      <div
        className="relative z-10 flex items-center justify-between px-4 py-3 bg-[#141519]/90 border-b border-[#292b34]"
        style={{
          marginTop: 'max(env(safe-area-inset-top, 0px), 34px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-300 bg-[#23252e] px-2.5 py-1 rounded-md border border-[#323542]">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 rounded-lg bg-[#23252e] text-neutral-200 hover:bg-[#2e313d] disabled:opacity-40 transition-colors"
            title={t('zoomOut', language)}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 5}
            className="p-2 rounded-lg bg-[#23252e] text-neutral-200 hover:bg-[#2e313d] disabled:opacity-40 transition-colors"
            title={t('zoomIn', language)}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={scale === 1 && position.x === 0 && position.y === 0}
            className="p-2 rounded-lg bg-[#23252e] text-neutral-200 hover:bg-[#2e313d] disabled:opacity-40 transition-colors"
            title={t('resetZoom', language)}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-[#23252e] text-neutral-200 hover:bg-red-900/60 hover:text-white transition-colors"
          title={t('close', language)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Viewport */}
      <div
        className="flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={t('illustration', language)}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (scale > 1) {
              setScale(1);
              setPosition({ x: 0, y: 0 });
              lastPositionRef.current = { x: 0, y: 0 };
            } else {
              setScale(2.5);
            }
          }}
          className={`max-w-full max-h-full object-contain ${
            isDragging ? '' : 'transition-transform duration-150 ease-out'
          }`}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
        />
      </div>

      {/* Hint Footer */}
      <div
        className="relative z-10 text-center py-2.5 text-[11px] text-neutral-400 bg-[#141519]/80 pointer-events-none"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
        }}
      >
        {t('imageViewerHint', language)}
      </div>
    </div>
  );
};
