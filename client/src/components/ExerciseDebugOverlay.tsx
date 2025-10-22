/**
 * Exercise Debug Overlay
 * 
 * Development-only component that shows exercise IDs and external IDs
 * to help debug binding issues between exercises, instructions, and media.
 * 
 * Usage: Wrap exercise cards with this component in development mode
 */

interface ExerciseDebugOverlayProps {
  exerciseName: string;
  exerciseId?: string;
  externalId?: string | null;
  children: React.ReactNode;
  enabled?: boolean;
}

export function ExerciseDebugOverlay({ 
  exerciseName, 
  exerciseId, 
  externalId,
  children,
  enabled = import.meta.env.DEV
}: ExerciseDebugOverlayProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div 
        className="absolute top-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none z-10"
        title="Debug info (dev only)"
      >
        <div>Name: {exerciseName}</div>
        {exerciseId && <div>ID: {exerciseId.slice(0, 8)}</div>}
        {externalId && <div>ExtID: {externalId.slice(0, 8)}</div>}
        {!exerciseId && !externalId && <div className="text-yellow-400">⚠ No IDs</div>}
      </div>
    </div>
  );
}
