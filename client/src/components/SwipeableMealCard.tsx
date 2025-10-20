import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, X, Check } from "lucide-react";
import type { MealPlan } from "@shared/schema";

interface SwipeableMealCardProps {
  meal: MealPlan;
  onSwipeLeft: (meal: MealPlan) => void; // Skip - good but not now
  onSwipeRight: (meal: MealPlan) => void; // Dislike - bad meal
  onTap: (meal: MealPlan) => void; // Open details
  isTopCard: boolean;
  stackPosition: number; // 0 = top, 1 = second, 2 = third, etc.
}

export function SwipeableMealCard({
  meal,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  isTopCard,
  stackPosition,
}: SwipeableMealCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const tapStartTime = useRef<number>(0);
  const hasMoved = useRef(false);

  const swipeThreshold = 100; // Pixels to trigger swipe
  const rotation = dragOffset.x / 20; // Rotation based on drag
  const opacity = Math.max(0, 1 - Math.abs(dragOffset.x) / 300);

  // Calculate stack transform
  const stackTransform = isTopCard
    ? ""
    : `translateY(${stackPosition * 10}px) scale(${1 - stackPosition * 0.05})`;

  const handleStart = (clientX: number, clientY: number) => {
    if (!isTopCard) return;
    setIsDragging(true);
    setStartPos({ x: clientX, y: clientY });
    tapStartTime.current = Date.now();
    hasMoved.current = false;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !isTopCard) return;
    
    const deltaX = clientX - startPos.x;
    const deltaY = clientY - startPos.y;
    
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMoved.current = true;
    }
    
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleEnd = () => {
    if (!isDragging || !isTopCard) return;
    
    setIsDragging(false);

    // Check if it was a tap (no movement and quick)
    const tapDuration = Date.now() - tapStartTime.current;
    if (!hasMoved.current && tapDuration < 300) {
      onTap(meal);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    // Check swipe threshold
    if (Math.abs(dragOffset.x) > swipeThreshold) {
      const direction = dragOffset.x > 0 ? "left" : "right";
      
      // Animate card flying off screen
      setDragOffset({ x: dragOffset.x > 0 ? 1000 : -1000, y: dragOffset.y });
      
      setTimeout(() => {
        if (direction === "left") {
          onSwipeLeft(meal);
        } else {
          onSwipeRight(meal);
        }
        setDragOffset({ x: 0, y: 0 });
      }, 300);
    } else {
      // Snap back
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleEnd();
      }
    };

    if (isDragging) {
      window.addEventListener("mouseup", handleGlobalMouseUp);
      window.addEventListener("mousemove", handleGlobalMouseMove);
    }

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [isDragging]);

  const handleGlobalMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const showLeftIndicator = dragOffset.x > 50;
  const showRightIndicator = dragOffset.x < -50;

  return (
    <div
      ref={cardRef}
      className="absolute top-0 left-0 w-full touch-none"
      style={{
        transform: `${stackTransform} translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 10 - stackPosition,
        pointerEvents: isTopCard ? "auto" : "none",
        opacity: isTopCard ? opacity : 1 - stackPosition * 0.2,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Card 
        data-testid={`card-swipeable-meal-${meal.id}`}
        className="overflow-hidden cursor-grab active:cursor-grabbing select-none relative"
      >
        {/* Swipe Indicators */}
        {showLeftIndicator && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-green-500 rounded-full p-4">
              <Check className="h-12 w-12 text-white" data-testid="icon-swipe-skip" />
            </div>
          </div>
        )}
        {showRightIndicator && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-red-500 rounded-full p-4">
              <X className="h-12 w-12 text-white" data-testid="icon-swipe-dislike" />
            </div>
          </div>
        )}

        {/* Meal Photo */}
        {meal.imageUrl && (
          <div className="w-full h-64 overflow-hidden">
            <img 
              src={meal.imageUrl} 
              alt={meal.name}
              className="w-full h-full object-cover"
              data-testid="img-meal-swipe-photo"
            />
          </div>
        )}
        
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" data-testid="badge-meal-type">{meal.mealType}</Badge>
                {meal.tags?.slice(0, 2).map((tag) => (
                  <Badge key={tag} className="bg-chart-4/10 text-chart-4 border-0">
                    {tag}
                  </Badge>
                ))}
              </div>
              <CardTitle className="text-xl" data-testid="text-meal-name">{meal.name}</CardTitle>
              {meal.description && (
                <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-meal-description">
                  {meal.description}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-chart-5" />
              <span className="font-mono font-semibold" data-testid="text-calories">{meal.calories}</span>
              <span className="text-muted-foreground">kcal</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono font-semibold" data-testid="text-prep-time">{meal.prepTime}</span>
              <span className="text-muted-foreground">min</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 rounded-md bg-muted/50">
              <div className="font-semibold" data-testid="text-protein">{meal.protein}g</div>
              <div className="text-muted-foreground text-xs">Protein</div>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/50">
              <div className="font-semibold" data-testid="text-carbs">{meal.carbs}g</div>
              <div className="text-muted-foreground text-xs">Carbs</div>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/50">
              <div className="font-semibold" data-testid="text-fat">{meal.fat}g</div>
              <div className="text-muted-foreground text-xs">Fat</div>
            </div>
          </div>

          {/* AI Reasoning - why this meal was recommended */}
          {meal.aiReasoning && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20" data-testid="container-ai-reasoning">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs bg-primary/20 border-primary/30 shrink-0">
                  AI Recommended
                </Badge>
                <p className="text-sm text-foreground leading-relaxed" data-testid="text-ai-reasoning">
                  {meal.aiReasoning}
                </p>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground pt-2">
            <p data-testid="text-swipe-instruction">
              <span className="font-medium">Swipe left</span> to skip • <span className="font-medium">Swipe right</span> to dislike
            </p>
            <p className="text-xs mt-1" data-testid="text-tap-instruction">Tap to view recipe</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
