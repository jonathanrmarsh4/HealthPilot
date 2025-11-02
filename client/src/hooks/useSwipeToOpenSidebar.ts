import { useEffect } from 'react';

interface SwipeDetectionOptions {
  onSwipeRight: () => void;
  edgeThreshold?: number; // Distance from left edge in pixels
  minSwipeDistance?: number; // Minimum swipe distance in pixels
  maxSwipeTime?: number; // Maximum time for swipe in milliseconds
  maxSwipeAngle?: number; // Maximum angle from horizontal in degrees
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
  maxSwipeAngle = 30, // Maximum 30° angle from horizontal
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
    let touchIdentifier: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      // Only track the first touch if no gesture is in progress
      if (touchIdentifier !== null) return;

      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      // Only track if touch starts near left edge
      if (touchStartX <= edgeThreshold) {
        touchStartTime = Date.now();
        touchIdentifier = touch.identifier;
        isValidSwipe = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isValidSwipe || touchIdentifier === null) return;

      // Find the touch that matches our tracked identifier
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdentifier);
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      // Calculate angle from horizontal (in degrees)
      // tan(angle) = opposite / adjacent = deltaY / deltaX
      const angle = Math.abs(Math.atan2(deltaY, deltaX) * (180 / Math.PI));

      // If angle exceeds threshold, it's more vertical than horizontal - cancel swipe
      // Use angle threshold instead of simple comparison to allow slight vertical drift
      if (angle > maxSwipeAngle) {
        isValidSwipe = false;
        touchIdentifier = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // If no gesture is tracked, nothing to do
      if (touchIdentifier === null) return;

      // Find the touch that matches our tracked identifier in changedTouches
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdentifier);
      
      // Always reset tracking when our tracked touch ends
      // (even if the gesture was invalidated during touchmove)
      const wasValidSwipe = isValidSwipe;
      isValidSwipe = false;
      touchIdentifier = null;

      // If we can't find the touch or gesture was already invalidated, we're done
      if (!touch || !wasValidSwipe) {
        return;
      }

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const deltaTime = Date.now() - touchStartTime;

      // Calculate final angle
      const angle = Math.abs(Math.atan2(deltaY, deltaX) * (180 / Math.PI));

      // Check if it's a valid right swipe
      if (
        deltaX > minSwipeDistance &&
        deltaTime < maxSwipeTime &&
        angle <= maxSwipeAngle // Ensure final angle is within threshold
      ) {
        onSwipeRight();
      }
    };

    const handleTouchCancel = () => {
      // Reset tracking when touch is cancelled
      isValidSwipe = false;
      touchIdentifier = null;
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [onSwipeRight, edgeThreshold, minSwipeDistance, maxSwipeTime, maxSwipeAngle]);
}
