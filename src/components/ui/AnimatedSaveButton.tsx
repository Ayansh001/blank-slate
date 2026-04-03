
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedSaveButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  uniqueId?: string; // Add unique identifier to prevent cross-animation
}

export function AnimatedSaveButton({ 
  onClick, 
  disabled = false,
  className,
  title = "Save",
  uniqueId = Math.random().toString(36).substr(2, 9) // Generate unique ID if not provided
}: AnimatedSaveButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (disabled || isAnimating) return;

    setIsAnimating(true);
    onClick?.();

    // Reset after animation duration (1s)
    setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
  };

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "action_has has_saved",
        isAnimating && `is-animating-${uniqueId}`, // Use unique class for this instance
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{ 
        width: '20px', 
        height: '20px',
        // Apply animation styles directly to this instance when animating
        ...(isAnimating && {
          '--unique-id': uniqueId
        })
      }}
    >
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
        fill="none"
        width="16"
        height="16"
        className={cn(
          "h-4 w-4",
          isAnimating && `animating-svg-${uniqueId}` // Unique animation class for SVG
        )}
      >
        <path
          d="m19,21H5c-1.1,0-2-.9-2-2V5c0-1.1.9-2,2-2h11l5,5v11c0,1.1-.9,2-2,2Z"
          strokeLinejoin="round"
          strokeLinecap="round"
          data-path="box"
          className={isAnimating ? `animate-box-${uniqueId}` : ''}
        />
        <path
          d="M7 3L7 8L15 8"
          strokeLinejoin="round"
          strokeLinecap="round"
          data-path="line-top"
          className={isAnimating ? `animate-line-top-${uniqueId}` : ''}
        />
        <path
          d="M17 20L17 13L7 13L7 20"
          strokeLinejoin="round"
          strokeLinecap="round"
          data-path="line-bottom"
          className={isAnimating ? `animate-line-bottom-${uniqueId}` : ''}
        />
      </svg>
    </button>
  );
}
