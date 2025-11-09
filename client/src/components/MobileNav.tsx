import * as React from "react";
import {
  Menu as MenuIcon,
  Sparkles,
  Bolt,
  Dumbbell,
  HeartPulse,
  Pill,
  ClipboardList,
  User,
  Moon,
  Activity,
  Target,
  Home,
  Sun,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

type LinkishProps = {
  to: string;
  className?: string;
  onClick?: React.MouseEventHandler;
  children?: React.ReactNode;
};

type MobileNavProps = {
  isAdmin?: boolean;
  currentPath?: string;
  navigate?: (path: string) => void;
  LinkComponent?: React.ComponentType<LinkishProps>;
  tileHeightClass?: string;
  fabSizeClass?: string;
};

export default function MobileNav({
  isAdmin = false,
  currentPath,
  navigate,
  LinkComponent,
  tileHeightClass = "h-16",
  fabSizeClass = "w-16 h-16",
}: MobileNavProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const doNavigate = React.useCallback(
    (path: string) => {
      if (navigate) return navigate(path);
      if (typeof window !== "undefined") window.location.assign(path);
    },
    [navigate]
  );

  const A = React.useMemo(() => {
    if (LinkComponent) {
      return function Linkish(props: LinkishProps) {
        const { to, children, className, onClick } = props;
        return (
          <LinkComponent to={to} className={className} onClick={onClick}>
            {children}
          </LinkComponent>
        );
      };
    }
    return function Anchorish(props: LinkishProps) {
      const { to, children, className, onClick } = props;
      return (
        <a
          href={to}
          className={className}
          onClick={(e) => {
            if (navigate) {
              e.preventDefault();
              doNavigate(to);
            }
            onClick?.(e);
          }}
        >
          {children}
        </a>
      );
    };
  }, [LinkComponent, navigate, doNavigate]);

  const isActive = React.useCallback(
    (path: string) =>
      !!currentPath &&
      (currentPath === path || (path !== "/" && currentPath.startsWith(path))),
    [currentPath]
  );

  const Sheet: React.FC<
    React.PropsWithChildren<{ open: boolean; onClose: () => void; title: string }>
  > = ({ open, onClose, title, children }) => {
    const animationDuration = prefersReducedMotion ? "0ms" : "300ms";
    const backdropDuration = prefersReducedMotion ? "0ms" : "200ms";
    
    // Presence management: track if sheet should be rendered (for exit animations)
    const [isPresent, setIsPresent] = React.useState(false);
    const [isAnimating, setIsAnimating] = React.useState(false);
    
    const [dragOffset, setDragOffset] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const startY = React.useRef(0);
    const currentY = React.useRef(0);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Handle mount/unmount with animation
    React.useEffect(() => {
      if (open) {
        setIsPresent(true);
        // Start animation after mount
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      } else {
        setIsAnimating(false);
        // Unmount after exit animation completes
        const timer = setTimeout(() => {
          setIsPresent(false);
        }, prefersReducedMotion ? 0 : 300);
        return () => clearTimeout(timer);
      }
    }, [open]);

    const handleHeaderTouchStart = (e: React.TouchEvent) => {
      // Only enable drag from the header area
      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
      setIsDragging(true);
    };

    const handleHeaderTouchMove = (e: React.TouchEvent) => {
      if (!isDragging) return;
      
      currentY.current = e.touches[0].clientY;
      const delta = currentY.current - startY.current;
      
      // Only allow downward drag
      if (delta > 0) {
        setDragOffset(delta);
        // Prevent scrolling while dragging
        e.preventDefault();
      } else {
        // Cancel drag on upward movement
        setIsDragging(false);
        setDragOffset(0);
      }
    };

    const handleHeaderTouchEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);
      
      const delta = currentY.current - startY.current;
      
      // Close if dragged down more than 100px
      if (delta > 100) {
        onClose();
      }
      
      setDragOffset(0);
    };
    
    // Don't render until needed (enables exit animation)
    if (!isPresent) return null;
    
    return (
      <>
        <div
          className={[
            "fixed inset-0 bg-black/40 transition-opacity ease-out",
            isAnimating ? "opacity-100" : "opacity-0",
            !isAnimating && "pointer-events-none",
          ].join(" ")}
          onClick={onClose}
          aria-hidden
          style={{
            transitionDuration: backdropDuration,
            transitionTimingFunction: isAnimating ? 'cubic-bezier(0.22, 1, 0.36, 1)' : 'ease-out',
          }}
        />
        <div
          className={[
            "fixed left-0 right-0 bottom-0 z-50",
            isDragging ? "" : "transition-transform",
            isAnimating ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          style={{
            transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
            transitionDuration: animationDuration,
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="max-w-[420px] mx-auto px-3 pb-[env(safe-area-inset-bottom)]">
            <div className="rounded-2xl border border-black/10 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-zinc-900/70 overflow-hidden shadow-2xl">
              <div 
                className="pt-2 px-4 pb-3 border-b border-black/5 dark:border-white/5 cursor-grab active:cursor-grabbing"
                onTouchStart={handleHeaderTouchStart}
                onTouchMove={handleHeaderTouchMove}
                onTouchEnd={handleHeaderTouchEnd}
              >
                <div className="w-24 h-1.5 mx-auto mb-2 rounded-full bg-black/15 dark:bg-white/20" />
                <div className="font-extrabold tracking-wide text-black dark:text-white">{title}</div>
              </div>
              <div ref={scrollContainerRef} className="max-h-[70vh] overflow-y-auto">{children}</div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const Tile: React.FC<
    React.PropsWithChildren<{
      onClick?: () => void;
      className?: string;
      icon?: React.ReactNode;
      ariaLabel?: string;
    }>
  > = ({ onClick, className = "", icon, children, ariaLabel }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        "rounded-xl border border-black/10 dark:border-white/10 text-sm",
        "flex items-center justify-center",
        children ? "gap-2" : "",
        "bg-white/70 dark:bg-zinc-900/70 hover:bg-black/5 dark:hover:bg-white/10",
        "transition-colors",
        tileHeightClass,
        className,
      ].join(" ")}
      style={{ minHeight: 44 }}
    >
      {icon}
      {children && <span className="font-medium">{children}</span>}
    </button>
  );

  const Today = (
    <section className="py-2">
      <h3 className="px-4 text-[13px] font-extrabold uppercase tracking-widest opacity-75">
        Today
      </h3>
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <Tile
          onClick={() => {
            doNavigate("/training");
            setMenuOpen(false);
          }}
          icon={<Dumbbell className="w-4 h-4" />}
          ariaLabel="Training"
        >
          Training
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/recovery");
            setMenuOpen(false);
          }}
          icon={<HeartPulse className="w-4 h-4" />}
          ariaLabel="Recovery"
        >
          Recovery
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/supplements");
            setMenuOpen(false);
          }}
          icon={<Pill className="w-4 h-4" />}
          ariaLabel="Supplements"
        >
          Supplements
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/smartfuel");
            setMenuOpen(false);
          }}
          icon={<Sparkles className="w-4 h-4" />}
          ariaLabel="SmartFuel"
        >
          SmartFuel
        </Tile>
      </div>
    </section>
  );

  const Track = (
    <section className="py-2">
      <h3 className="px-4 text-[13px] font-extrabold uppercase tracking-widest opacity-75">
        Track
      </h3>
      <div className="grid grid-cols-3 gap-3 px-4 py-3">
        <Tile
          onClick={() => {
            doNavigate("/goals");
            setMenuOpen(false);
          }}
          icon={<Target className="w-4 h-4" />}
          ariaLabel="Goals"
        >
          Goals
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/biomarkers");
            setMenuOpen(false);
          }}
          icon={<Activity className="w-4 h-4" />}
          ariaLabel="Biomarkers"
        >
          Biomarkers
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/sleep");
            setMenuOpen(false);
          }}
          icon={<Moon className="w-4 h-4" />}
          ariaLabel="Sleep"
        >
          Sleep
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/symptoms");
            setMenuOpen(false);
          }}
          icon={<HeartPulse className="w-4 h-4" />}
          ariaLabel="Symptoms"
        >
          Symptoms
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/biological-age");
            setMenuOpen(false);
          }}
          icon={<ClipboardList className="w-4 h-4" />}
          ariaLabel="Longevity"
        >
          Longevity
        </Tile>
        <div className="hidden sm:block" />
      </div>
    </section>
  );

  const DataAndSettings = (
    <section className="py-2">
      <h3 className="px-4 text-[13px] font-extrabold uppercase tracking-widest opacity-75">
        Data &amp; Settings
      </h3>
      <div className="grid grid-cols-3 gap-3 px-4 py-3">
        <Tile
          onClick={() => {
            doNavigate("/profile");
            setMenuOpen(false);
          }}
          icon={<User className="w-5 h-5" />}
          ariaLabel="Profile"
        />
        <Tile
          onClick={() => {
            doNavigate("/records");
            setMenuOpen(false);
          }}
          icon={<ClipboardList className="w-5 h-5" />}
          ariaLabel="Health Records"
        />
        <Tile
          onClick={() => {
            doNavigate("/training/fitness-profile");
            setMenuOpen(false);
          }}
          icon={<ClipboardList className="w-5 h-5" />}
          ariaLabel="Fitness Profile"
        />
        <Tile
          onClick={() => {
            setTheme(theme === "dark" ? "light" : "dark");
          }}
          icon={theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          ariaLabel={theme === "dark" ? "Light Mode" : "Dark Mode"}
        />
      </div>

      <div className="flex items-center justify-center flex-wrap gap-4 px-4 pb-5 pt-1 text-sm opacity-90">
        <A to="/privacy" className="underline" onClick={() => setMenuOpen(false)}>
          Privacy Policy
        </A>
        <A
          to="/privacy-dashboard"
          className="underline"
          onClick={() => setMenuOpen(false)}
        >
          Privacy Dashboard
        </A>
        {isAdmin && (
          <A to="/admin" className="underline" onClick={() => setMenuOpen(false)}>
            Admin
          </A>
        )}
      </div>
    </section>
  );

  const QuickActions = (
    <Sheet open={quickOpen} onClose={() => setQuickOpen(false)} title="Quick Actions">
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <Tile
          onClick={() => {
            doNavigate("/");
            setQuickOpen(false);
          }}
          icon={<Home className="w-4 h-4" />}
          ariaLabel="Home"
        >
          Home
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/training/start");
            setQuickOpen(false);
          }}
          icon={<Dumbbell className="w-4 h-4" />}
          ariaLabel="Workout"
        >
          Workout
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/goals");
            setQuickOpen(false);
          }}
          icon={<ClipboardList className="w-4 h-4" />}
          ariaLabel="Goals"
        >
          Goals
        </Tile>
        <Tile
          onClick={() => {
            doNavigate("/symptoms/new");
            setQuickOpen(false);
          }}
          icon={<HeartPulse className="w-4 h-4" />}
          ariaLabel="Symptoms"
        >
          Symptoms
        </Tile>
      </div>
    </Sheet>
  );

  const OverflowMenu = (
    <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Browse">
      {Today}
      {Track}
      {DataAndSettings}
    </Sheet>
  );

  const fabBg =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "bg-white text-zinc-900 border-white/20"
      : "bg-zinc-900 text-white border-black/10";

  return (
    <>
      <nav
        className="fixed left-0 right-0 bottom-0 z-40 backdrop-blur-xl bg-background/80 border-t border-border px-4"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
        aria-label="Primary"
      >
        <div className="max-w-[420px] mx-auto">
          <div className="grid grid-cols-3 items-end py-3 gap-2">
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1 min-h-12"
              onClick={() => setMenuOpen(true)}
              aria-label="Menu"
              data-testid="button-menu"
            >
              <MenuIcon className="w-5 h-5" />
              <span className="text-[11px]">Menu</span>
            </button>

            <div className="flex justify-center relative -mt-6">
              <button
                type="button"
                className={[
                  "rounded-full border shadow-xl flex items-center justify-center",
                  fabSizeClass,
                  fabBg,
                ].join(" ")}
                aria-label="Quick Actions"
                onClick={() => setQuickOpen(true)}
                data-testid="button-quick-actions"
                style={{ 
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <Bolt className="w-6 h-6" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => doNavigate("/insights")}
              className="flex flex-col items-center justify-center gap-1 min-h-12"
              aria-current={isActive("/insights") ? "page" : undefined}
              aria-label="Insights"
              data-testid="button-insights"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[11px] font-medium">Insights</span>
            </button>
          </div>
        </div>
      </nav>

      {OverflowMenu}
      {QuickActions}
    </>
  );
}
