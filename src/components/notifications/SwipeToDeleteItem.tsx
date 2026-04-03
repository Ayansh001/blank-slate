
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SwipeToDeleteItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

export function SwipeToDeleteItem({ children, onDelete, className }: SwipeToDeleteItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentX, setCurrentX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure and observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => setContainerWidth(el.offsetWidth);
    updateWidth();

    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const threshold = containerWidth * 0.5;

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isDeleting || startX === null) return;
    const dx = Math.max(0, startX - e.touches[0].clientX); // left-only
    setCurrentX(Math.min(dx, containerWidth));
  };

  const handleTouchEnd = () => {
    if (!isDragging || isDeleting) return;
    setIsDragging(false);

    if (currentX >= threshold) {
      setIsDeleting(true);
      setCurrentX(containerWidth); // slide fully out
    } else {
      setCurrentX(0); // snap back
    }
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDeleting) return;
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isDeleting || startX === null) return;
    const dx = Math.max(0, startX - e.clientX); // left-only
    setCurrentX(Math.min(dx, containerWidth));
  };

  const handleMouseUpOrLeave = () => {
    if (!isDragging || isDeleting) return;
    setIsDragging(false);

    if (currentX >= threshold) {
      setIsDeleting(true);
      setCurrentX(containerWidth); // slide fully out
    } else {
      setCurrentX(0); // snap back
    }
  };

  // When the slide-out animation finishes, delete the item
  const handleTransitionEnd = () => {
    if (isDeleting) {
      onDelete();
    }
  };

  const styleTransition = isDragging
    ? 'none'
    : 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{ touchAction: 'pan-y' }}
    >
      <div
        className={cn(
          'relative cursor-pointer select-none'
        )}
        style={{
          transform: `translateX(-${currentX}px)`,
          transition: styleTransition,
          willChange: 'transform'
        }}
        onTransitionEnd={handleTransitionEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={isDragging ? handleMouseMove : undefined}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        // Only intercept clicks when partially swiped
        onClick={!isDragging && currentX === 0 ? undefined : () => setCurrentX(0)}
      >
        {children}
      </div>
    </div>
  );
}
