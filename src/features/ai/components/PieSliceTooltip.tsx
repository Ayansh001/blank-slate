
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PieSliceTooltipProps {
  isVisible: boolean;
  title: string;
  percentage: number;
  count: number;
  x: number;
  y: number;
  onClose: () => void;
}

export function PieSliceTooltip({ 
  isVisible, 
  title, 
  percentage, 
  count, 
  x, 
  y, 
  onClose 
}: PieSliceTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full"
      style={{
        left: `${x}px`,
        top: `${y - 12}px`,
      }}
      data-state={isVisible ? 'open' : 'closed'}
    >
      <div className="pointer-events-auto rounded-md border border-border bg-card/95 shadow-md px-3 py-2 text-sm text-card-foreground backdrop-blur animate-popup-reveal">
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground">
          {percentage.toFixed(1)}% • {count} items
        </div>
        {/* Arrow */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-card/95" />
      </div>
    </div>,
    document.body
  );
}
