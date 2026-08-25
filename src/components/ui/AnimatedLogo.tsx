
import React from 'react';

export function AnimatedLogo() {
  return (
    <div className="flex items-center">
      {/* SVG definitions for gradients */}
      <svg height="0" width="0" viewBox="0 0 64 64" className="absolute">
        <defs>
          {/* Gradient for S - Deep Navy to Silver */}
          <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="gradient-s">
            <stop stopColor="#1a1a2e"></stop>
            <stop stopColor="#c4c4c4" offset="1"></stop>
            <animateTransform 
              repeatCount="indefinite" 
              keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" 
              keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" 
              dur="20s" 
              values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" 
              type="rotate" 
              attributeName="gradientTransform"
            />
          </linearGradient>
          
          {/* Gradient for T - Charcoal to Gold */}
          <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="gradient-t">
            <stop stopColor="#2d2d2d"></stop>
            <stop stopColor="#d4af37" offset="1"></stop>
            <animateTransform 
              repeatCount="indefinite" 
              keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" 
              keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" 
              dur="20s" 
              values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" 
              type="rotate" 
              attributeName="gradientTransform"
            />
          </linearGradient>
          
          {/* Gradient for U - Deep Purple to Rose Gold */}
          <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="gradient-u">
            <stop stopColor="#4a154b"></stop>
            <stop stopColor="#e8b4b8" offset="1"></stop>
            <animateTransform 
              repeatCount="indefinite" 
              keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" 
              keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" 
              dur="20s" 
              values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" 
              type="rotate" 
              attributeName="gradientTransform"
            />
          </linearGradient>
          
          {/* Gradient for D - Deep Navy to Silver */}
          <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="gradient-d">
            <stop stopColor="#1a1a2e"></stop>
            <stop stopColor="#c4c4c4" offset="1"></stop>
            <animateTransform 
              repeatCount="indefinite" 
              keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" 
              keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" 
              dur="20s" 
              values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" 
              type="rotate" 
              attributeName="gradientTransform"
            />
          </linearGradient>
          
          {/* Gradient for Y - Charcoal to Gold */}
          <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="gradient-y">
            <stop stopColor="#2d2d2d"></stop>
            <stop stopColor="#d4af37" offset="1"></stop>
            <animateTransform 
              repeatCount="indefinite" 
              keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" 
              keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" 
              dur="20s" 
              values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" 
              type="rotate" 
              attributeName="gradientTransform"
            />
          </linearGradient>
          
          {/* Gradient for V - Deep Purple to Rose Gold */}
          <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="gradient-v">
            <stop stopColor="#4a154b"></stop>
            <stop stopColor="#e8b4b8" offset="1"></stop>
            <animateTransform 
              repeatCount="indefinite" 
              keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" 
              keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" 
              dur="20s" 
              values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" 
              type="rotate" 
              attributeName="gradientTransform"
            />
          </linearGradient>
          
          {/* Gradient for A - Deep Navy to Silver */}
          <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="gradient-a">
            <stop stopColor="#1a1a2e"></stop>
            <stop stopColor="#c4c4c4" offset="1"></stop>
            <animateTransform 
              repeatCount="indefinite" 
              keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" 
              keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" 
              dur="20s" 
              values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" 
              type="rotate" 
              attributeName="gradientTransform"
            />
          </linearGradient>
          
          {/* Gradient for L - Charcoal to Gold */}
          <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="gradient-l">
            <stop stopColor="#2d2d2d"></stop>
            <stop stopColor="#d4af37" offset="1"></stop>
            <animateTransform 
              repeatCount="indefinite" 
              keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" 
              keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" 
              dur="20s" 
              values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" 
              type="rotate" 
              attributeName="gradientTransform"
            />
          </linearGradient>
        </defs>
      </svg>

      {/* Animated Letters */}
      <div className="flex items-center space-x-0.5 animated-logo">
        {/* S */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-s)" 
            d="M 24 8 C 22 4 18 2 12 4 C 8 6 8 10 12 12 L 20 16 C 24 18 24 22 20 24 C 16 26 12 24 10 20" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '0s' }}
          />
        </svg>

        {/* T */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-t)" 
            d="M 6 6 L 26 6 M 16 6 L 16 26" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '0.3s' }}
          />
        </svg>

        {/* U */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-u)" 
            d="M 8 6 L 8 18 C 8 22 12 26 16 26 C 20 26 24 22 24 18 L 24 6" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '0.6s' }}
          />
        </svg>

        {/* D */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-d)" 
            d="M 8 6 L 8 26 L 18 26 C 22 26 26 22 26 18 L 26 14 C 26 10 22 6 18 6 Z" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '0.9s' }}
          />
        </svg>

        {/* Y */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-y)" 
            d="M 8 6 L 16 16 L 24 6 M 16 16 L 16 26" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '1.2s' }}
          />
        </svg>

        {/* V */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-v)" 
            d="M 6 6 L 16 26 L 26 6" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '1.5s' }}
          />
        </svg>

        {/* A */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-a)" 
            d="M 8 26 L 16 6 L 24 26 M 12 18 L 20 18" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '1.8s' }}
          />
        </svg>

        {/* U */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-u)" 
            d="M 8 6 L 8 18 C 8 22 12 26 16 26 C 20 26 24 22 24 18 L 24 6" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '2.1s' }}
          />
        </svg>

        {/* L */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-l)" 
            d="M 8 6 L 8 26 L 24 26" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '2.4s' }}
          />
        </svg>

        {/* T */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="28" width="16" className="inline-block animated-letter">
          <path 
            strokeLinejoin="round" 
            strokeLinecap="round" 
            strokeWidth="8" 
            stroke="url(#gradient-t)" 
            d="M 6 6 L 26 6 M 16 6 L 16 26" 
            className="animated-dash" 
            pathLength="360"
            style={{ animationDelay: '2.7s' }}
          />
        </svg>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .animated-logo .animated-letter {
            filter: drop-shadow(0 0 8px rgba(196, 196, 196, 0.2)) drop-shadow(0 0 16px rgba(212, 175, 55, 0.15));
          }
          
          .animated-logo .animated-dash {
            animation: dashArray 5s ease-in-out infinite, dashOffset 5s linear infinite;
          }
          
          @keyframes dashArray {
            0% {
              stroke-dasharray: 0 1 359 0;
            }
            50% {
              stroke-dasharray: 0 359 1 0;
            }
            100% {
              stroke-dasharray: 359 1 0 0;
            }
          }
          
          @keyframes dashOffset {
            0% {
              stroke-dashoffset: 365;
            }
            100% {
              stroke-dashoffset: 5;
            }
          }
          
          @media (prefers-reduced-motion: reduce) {
            .animated-logo .animated-dash {
              animation: none;
            }
            
            .animated-logo .animated-letter {
              filter: none;
            }
          }
        `
      }} />
    </div>
  );
}
