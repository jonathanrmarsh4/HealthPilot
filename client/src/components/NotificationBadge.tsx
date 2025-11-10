import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { handleDeepLink } from '@/lib/notifications/deeplink';

export function NotificationBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss } = useNotifications();

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <Info className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          data-testid="button-notifications"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      <NotificationSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        dismiss={dismiss}
        getPriorityIcon={getPriorityIcon}
        getPriorityColor={getPriorityColor}
      />
    </>
  );
}

interface NotificationSheetProps {
  open: boolean;
  onClose: () => void;
  notifications: any[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  getPriorityIcon: (priority: string) => JSX.Element;
  getPriorityColor: (priority: string) => string;
}

function NotificationSheet({
  open,
  onClose,
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  dismiss,
  getPriorityIcon,
  getPriorityColor,
}: NotificationSheetProps) {
  const [isPresent, setIsPresent] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animationDuration = prefersReducedMotion ? '0ms' : '300ms';
  const backdropDuration = prefersReducedMotion ? '0ms' : '200ms';

  useEffect(() => {
    if (open) {
      setIsPresent(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsPresent(false);
      }, prefersReducedMotion ? 0 : 300);
      return () => clearTimeout(timer);
    }
  }, [open, prefersReducedMotion]);

  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleHeaderTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;
    
    // Only allow downward drag (positive delta) - sheet slides down to dismiss
    if (delta > 0) {
      setDragOffset(delta);
      e.preventDefault();
    } else {
      setDragOffset(0);
    }
  };

  const handleHeaderTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const delta = currentY.current - startY.current;
    const velocity = Math.abs(delta);
    
    // Close if dragged down more than 100px or with sufficient velocity (>50px)
    if (delta > 100 || (delta > 50 && velocity > 50)) {
      onClose();
    }
    
    setDragOffset(0);
  };

  if (!isPresent) return null;

  return (
    <>
      <div
        className={[
          "fixed inset-0 bg-black/60 transition-opacity ease-out z-50",
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
          "fixed left-0 right-0 top-0 z-50",
          isDragging ? "" : "transition-transform",
          isAnimating ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        style={{
          transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
          transitionDuration: animationDuration,
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="max-w-[420px] mx-auto px-3 pt-[env(safe-area-inset-top)]">
          <div className="rounded-b-2xl border border-black/10 dark:border-white/10 backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90 overflow-hidden shadow-2xl">
            <div className="pt-3 px-4 pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-extrabold tracking-wide text-black dark:text-white">
                  Notifications
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsRead()}
                    data-testid="button-mark-all-read"
                    className="text-xs h-7"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            <div ref={scrollContainerRef} className="max-h-[70vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
                  <p className="text-sm text-muted-foreground">
                    When you receive insights, alerts, or reminders, they'll appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover-elevate active-elevate-2 cursor-pointer ${!notification.read ? 'bg-accent/20' : ''}`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                        if (notification.deepLink) {
                          handleDeepLink(notification.deepLink);
                          onClose();
                        }
                      }}
                      data-testid={`notification-item-${notification.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getPriorityIcon(notification.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-sm" data-testid={`notification-title-${notification.id}`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!notification.read && (
                                <Badge variant="default" className="text-xs">New</Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismiss(notification.id);
                                }}
                                data-testid={`button-dismiss-${notification.id}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2" data-testid={`notification-body-${notification.id}`}>
                            {notification.body}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={getPriorityColor(notification.priority) as any} className="text-xs capitalize">
                              {notification.priority}
                            </Badge>
                            <span>•</span>
                            <span data-testid={`notification-time-${notification.id}`}>
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div 
              className="pt-2 px-4 pb-3 border-t border-black/5 dark:border-white/5 cursor-grab active:cursor-grabbing"
              onTouchStart={handleHeaderTouchStart}
              onTouchMove={handleHeaderTouchMove}
              onTouchEnd={handleHeaderTouchEnd}
            >
              <div className="w-24 h-1.5 mx-auto rounded-full bg-black/15 dark:bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
