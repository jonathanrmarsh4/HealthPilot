import { useState, useEffect, useRef, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface TileConfig {
  id: string;
  title: string;
  description: string;
  renderTile: () => ReactNode;
  alwaysVisible?: boolean; // If true, cannot be hidden
}

interface TilePreferences {
  visible: string[];
  order: string[];
}

interface TileManagerProps {
  page: string; // Page identifier (e.g., "training", "sleep", "biomarkers")
  tiles: TileConfig[];
  defaultVisible?: string[]; // Default visible tile IDs
}

function SortableTileItem({ id, children }: { id: string; children: ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Pass drag listeners as prop to children instead of applying to container
  return (
    <div ref={setNodeRef} style={style}>
      {typeof children === 'function' ? children({ attributes, listeners }) : children}
    </div>
  );
}

export function TileManager({ page, tiles, defaultVisible = [] }: TileManagerProps) {
  // Use defaultVisible if provided, otherwise show all tiles by default
  const initialVisible = defaultVisible.length > 0 ? defaultVisible : tiles.map(t => t.id);
  
  const [preferences, setPreferences] = useState<TilePreferences>({
    visible: initialVisible,
    order: tiles.map(t => t.id)
  });

  const [isManageOpen, setIsManageOpen] = useState(false);
  const lastSavedPreferencesRef = useRef<TilePreferences | null>(null);
  const isInitializedRef = useRef(false);

  // Fetch preferences from API
  const { data: savedPreferences, isLoading } = useQuery<TilePreferences>({
    queryKey: [`/api/user/tile-preferences/${page}`],
  });

  // Sync API preferences with local state (only on initial load)
  useEffect(() => {
    if (savedPreferences && !isInitializedRef.current) {
      const newPrefs = {
        visible: savedPreferences.visible?.length > 0 ? savedPreferences.visible : initialVisible,
        order: savedPreferences.order?.length > 0 ? savedPreferences.order : tiles.map(t => t.id)
      };
      setPreferences(newPrefs);
      lastSavedPreferencesRef.current = newPrefs;
      isInitializedRef.current = true;
    } else if (!savedPreferences && !isInitializedRef.current) {
      // No saved preferences, use initial defaults
      lastSavedPreferencesRef.current = {
        visible: initialVisible,
        order: tiles.map(t => t.id)
      };
      isInitializedRef.current = true;
    }
  }, [savedPreferences, initialVisible, tiles]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: TilePreferences) => {
      const response = await apiRequest("PATCH", `/api/user/tile-preferences/${page}`, prefs);
      return response.json();
    },
    onSuccess: (data) => {
      // Update the last saved reference without invalidating (which would cause a refetch)
      lastSavedPreferencesRef.current = preferences;
    }
  });

  // Debounced save - only when preferences differ from last saved
  useEffect(() => {
    if (!isInitializedRef.current) return; // Don't save until initialized
    
    const prefsChanged = 
      JSON.stringify(preferences) !== JSON.stringify(lastSavedPreferencesRef.current);
    
    if (!prefsChanged) return; // No changes, don't save
    
    const timeoutId = setTimeout(() => {
      if (preferences.visible.length > 0 || preferences.order.length > 0) {
        savePreferencesMutation.mutate(preferences);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPreferences(prev => {
        const oldIndex = prev.order.indexOf(active.id as string);
        const newIndex = prev.order.indexOf(over.id as string);
        const newOrder = arrayMove(prev.order, oldIndex, newIndex);
        return { ...prev, order: newOrder };
      });
    }
  };

  const toggleVisibility = (tileId: string) => {
    const tile = tiles.find(t => t.id === tileId);
    if (tile?.alwaysVisible) return; // Cannot hide always-visible tiles

    setPreferences(prev => {
      const newVisible = prev.visible.includes(tileId)
        ? prev.visible.filter(id => id !== tileId)
        : [...prev.visible, tileId];
      return { ...prev, visible: newVisible };
    });
  };

  const showAll = () => {
    setPreferences(prev => ({
      ...prev,
      visible: tiles.map(t => t.id)
    }));
  };

  const hideAll = () => {
    const alwaysVisibleIds = tiles.filter(t => t.alwaysVisible).map(t => t.id);
    setPreferences(prev => ({
      ...prev,
      visible: alwaysVisibleIds
    }));
  };

  // Sort tiles by user's preferred order
  const sortedTiles = [...tiles].sort((a, b) => {
    const aIndex = preferences.order.indexOf(a.id);
    const bIndex = preferences.order.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Filter visible tiles
  const visibleTiles = sortedTiles.filter(tile => 
    tile.alwaysVisible || preferences.visible.includes(tile.id)
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Manage Tiles Button */}
      <div className="flex justify-end">
        <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-manage-tiles">
              <Settings2 className="h-4 w-4 mr-2" />
              Manage Tiles
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Manage Tiles</SheetTitle>
              <SheetDescription>
                Show/hide and reorder tiles on this page
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {/* Show/Hide All Buttons */}
              <div className="flex gap-2">
                <Button onClick={showAll} variant="outline" size="sm" className="flex-1" data-testid="button-show-all">
                  <Eye className="h-4 w-4 mr-2" />
                  Show All
                </Button>
                <Button onClick={hideAll} variant="outline" size="sm" className="flex-1" data-testid="button-hide-all">
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide All
                </Button>
              </div>

              {/* Sortable Tile List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={preferences.order} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {sortedTiles.map((tile) => {
                      const isVisible = tile.alwaysVisible || preferences.visible.includes(tile.id);
                      const canToggle = !tile.alwaysVisible;
                      
                      return (
                        <SortableTileItem key={tile.id} id={tile.id}>
                          {({ attributes, listeners }) => (
                            <div 
                              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                              data-testid={`tile-config-${tile.id}`}
                            >
                              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm">{tile.title}</h4>
                                <p className="text-xs text-muted-foreground">{tile.description}</p>
                              </div>
                              {canToggle && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleVisibility(tile.id)}
                                  data-testid={`button-toggle-${tile.id}`}
                                >
                                  {isVisible ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </SortableTileItem>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Render Visible Tiles */}
      {visibleTiles.map((tile) => (
        <div key={tile.id} data-testid={`tile-${tile.id}`}>
          {tile.renderTile()}
        </div>
      ))}
    </div>
  );
}
