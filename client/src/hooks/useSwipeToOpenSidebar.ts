import { useEffect } from 'react';

interface SwipeDetectionOptions {
  onSwipeRight: () => void;
  edgeThreshold?: number; // Distance from left edge in pixels
  minSwipeDistance?: number; // Minimum swipe distance in pixels
  maxSwipeTime?: number; // Maximum time for swipe in milliseconds
}

/**
 * Custom hook to detect left-to-right swipe gestures starting from the left edge
 * Used to open the sidebar on mobile devices with a natural swipe gesture
 */
export function useSwipeToOpenSidebar({
  onSwipeRight,
  edgeThreshold = 50, // Swipe must start within 50px from left edge
  minSwipeDistance = 80, // Must swipe at least 80px
  maxSwipeTime = 500, // Must complete within 500ms
}: SwipeDetectionOptions) {
  useEffect(() => {
    // Only enable on touch devices (mobile/tablet)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
      return;
    }

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isValidSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();

      // Only track if touch starts near left edge
      isValidSwipe = touchStartX <= edgeThreshold;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isValidSwipe) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      // If user is scrolling vertically, cancel the swipe
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isValidSwipe = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isValidSwipe) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaTime = Date.now() - touchStartTime;

      // Check if it's a valid right swipe
      if (
        deltaX > minSwipeDistance &&
        deltaTime < maxSwipeTime &&
        Math.abs(touch.clientY - touchStartY) < 100 // Not too much vertical movement
      ) {
        onSwipeRight();
      }

      isValidSwipe = false;
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeRight, edgeThreshold, minSwipeDistance, maxSwipeTime]);
}
