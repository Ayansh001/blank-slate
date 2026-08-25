/**
 * Responsive utilities for different screen sizes
 */

export interface ViewportDimensions {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function getViewportDimensions(): ViewportDimensions {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  return {
    width,
    height,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024
  };
}

export function calculateMobilePositions(
  centerX: number,
  centerY: number,
  nodeCount: number,
  viewport: ViewportDimensions
) {
  const adjustedCenterX = viewport.isMobile ? viewport.width / 2 : centerX;
  const adjustedCenterY = viewport.isMobile ? viewport.height / 2 : centerY;
  
  const baseRadius = viewport.isMobile ? 120 : 180;
  const spacing = viewport.isMobile ? 30 : 40;
  
  return {
    centerX: adjustedCenterX,
    centerY: adjustedCenterY,
    radius: baseRadius,
    spacing
  };
}

export function getResponsiveNodeSize(isMobile: boolean) {
  return {
    width: isMobile ? 180 : 220,
    height: isMobile ? 80 : 120,
    fontSize: isMobile ? 11 : 12,
    padding: isMobile ? 8 : 12
  };
}