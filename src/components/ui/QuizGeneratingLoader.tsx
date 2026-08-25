
import React from 'react';
import { cn } from '@/lib/utils';

interface QuizGeneratingLoaderProps {
  className?: string;
}

export function QuizGeneratingLoader({ className }: QuizGeneratingLoaderProps) {
  return (
    <div className={cn("inline-block", className)} aria-hidden="true">
      <div className="hand-frame">
        <div className="hand-container">
          <div className="finger finger-1"></div>
          <div className="finger finger-2"></div>
          <div className="finger finger-3"></div>
          <div className="finger finger-4"></div>
          <div className="palm"></div>		
          <div className="thumb"></div>
        </div>
      </div>

      <style>{`
        .hand-frame {
          --frame-width: 60px;
          --frame-height: 60px;
          --hand-overhang: 10px;
          width: var(--frame-width);
          height: var(--frame-height);
          display: grid;
          place-items: center;
          padding-bottom: var(--hand-overhang);
          box-sizing: border-box;
          pointer-events: none;
        }

        @media (max-width: 640px) {
          .hand-frame {
            --frame-width: 45px;
            --frame-height: 45px;
            --hand-overhang: 8px;
          }
        }

        .hand-container {
          --skin-color: hsl(var(--foreground));
          --tap-speed: 0.6s;
          --tap-stagger: 0.1s;
          position: relative;
          width: 80px;
          height: 60px;
          transform: scale(0.5);
          transform-origin: center;
        }

        .hand-container:before {
          content: '';
          display: block;
          width: 180%;
          height: 75%;
          position: absolute;
          top: 70%;
          right: 20%;
          background-color: hsl(var(--muted-foreground) / 0.3);
          border-radius: 40px 10px;
          filter: blur(10px);
          opacity: 0.15;
        }

        .palm {
          display: block;
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          background-color: var(--skin-color);
          border-radius: 10px 40px;
        }

        .thumb {
          position: absolute;
          width: 120%;
          height: 38px;
          background-color: var(--skin-color);
          bottom: -18%;
          right: 1%;
          transform-origin: calc(100% - 20px) 20px;
          transform: rotate(-20deg);
          border-radius: 30px 20px 20px 10px;
          border-bottom: 2px solid hsl(var(--border));
          border-left: 2px solid hsl(var(--border));
        }

        .thumb:after {
          width: 20%;
          height: 60%;
          content: '';
          background-color: hsl(var(--background) / 0.3);
          position: absolute;
          bottom: -8%;
          left: 5px;
          border-radius: 60% 10% 10% 30%;
          border-right: 2px solid hsl(var(--border) / 0.5);
        }

        .finger {
          position: absolute;
          width: 80%;
          height: 35px;
          background-color: var(--skin-color);
          bottom: 32%;
          right: 64%;
          transform-origin: 100% 20px;
          animation-duration: calc(var(--tap-speed) * 2);
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          transform: rotate(10deg);
        }

        .finger:before {
          content: '';
          position: absolute;
          width: 140%;
          height: 30px;
          background-color: var(--skin-color);
          bottom: 8%;
          right: 65%;
          transform-origin: calc(100% - 20px) 20px;
          transform: rotate(-60deg);
          border-radius: 20px;
        }

        .finger-1 {
          animation-delay: 0;
          filter: brightness(70%);
          animation-name: tap-upper-1;
        }

        .finger-2 {
          animation-delay: var(--tap-stagger);
          filter: brightness(80%);
          animation-name: tap-upper-2;
        }

        .finger-3 {
          animation-delay: calc(var(--tap-stagger) * 2);
          filter: brightness(90%);
          animation-name: tap-upper-3;
        }

        .finger-4 {
          animation-delay: calc(var(--tap-stagger) * 3);
          filter: brightness(100%);
          animation-name: tap-upper-4;
        }

        @keyframes tap-upper-1 {
          0%, 50%, 100% {
            transform: rotate(10deg) scale(0.4);
          }
          40% {
            transform: rotate(50deg) scale(0.4);
          }
        }

        @keyframes tap-upper-2 {
          0%, 50%, 100% {
            transform: rotate(10deg) scale(0.6);
          }
          40% {
            transform: rotate(50deg) scale(0.6);
          }
        }

        @keyframes tap-upper-3 {
          0%, 50%, 100% {
            transform: rotate(10deg) scale(0.8);
          }
          40% {
            transform: rotate(50deg) scale(0.8);
          }
        }

        @keyframes tap-upper-4 {
          0%, 50%, 100% {
            transform: rotate(10deg) scale(1);
          }
          40% {
            transform: rotate(50deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
