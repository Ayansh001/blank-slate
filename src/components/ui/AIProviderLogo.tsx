
import React from 'react';
import { Gemini, OpenAI } from '@lobehub/icons';
import { AIServiceProvider } from '@/features/ai/types';

interface AIProviderLogoProps {
  provider: AIServiceProvider;
  size?: number | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function AIProviderLogo({ provider, size = 'md', className = '' }: AIProviderLogoProps) {
  const actualSize = typeof size === 'string' ? sizeMap[size] : size;
  
  console.log('AIProviderLogo rendering:', { provider, size, actualSize });
  
  // For Claude (anthropic), keep using emoji as requested
  if (provider === 'anthropic') {
    return (
      <span 
        className={`inline-block text-center ${className}`}
        style={{ width: actualSize, height: actualSize, fontSize: actualSize * 0.8 }}
        role="img" 
        aria-label="Claude (Anthropic)"
      >
        🧠
      </span>
    );
  }

  // OpenAI Logo - Using @lobehub/icons
  if (provider === 'openai') {
    try {
      return (
        <div 
          className={`inline-flex items-center justify-center ${className}`}
          style={{ width: actualSize, height: actualSize }}
          role="img"
          aria-label="OpenAI"
        >
          <OpenAI size={actualSize} />
        </div>
      );
    } catch (error) {
      console.error('Error rendering OpenAI logo:', error);
      return (
        <span 
          className={`inline-block text-center ${className}`}
          style={{ width: actualSize, height: actualSize, fontSize: actualSize * 0.8 }}
          role="img" 
          aria-label="OpenAI"
        >
          🤖
        </span>
      );
    }
  }

  // Gemini Logo - Using @lobehub/icons for proper colors and gradients
  if (provider === 'gemini') {
    try {
      return (
        <div 
          className={`inline-flex items-center justify-center ${className}`}
          style={{ width: actualSize, height: actualSize }}
          role="img"
          aria-label="Google Gemini"
        >
          <Gemini.Color size={actualSize} />
        </div>
      );
    } catch (error) {
      console.error('Error rendering Gemini logo:', error);
      return (
        <span 
          className={`inline-block text-center ${className}`}
          style={{ width: actualSize, height: actualSize, fontSize: actualSize * 0.8 }}
          role="img" 
          aria-label="Google Gemini"
        >
          ✨
        </span>
      );
    }
  }

  // Fallback to emoji for any other provider
  return (
    <span 
      className={`inline-block text-center ${className}`}
      style={{ width: actualSize, height: actualSize, fontSize: actualSize * 0.8 }}
      role="img" 
      aria-label={provider}
    >
      🤖
    </span>
  );
}
