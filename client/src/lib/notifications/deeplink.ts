import { useLocation } from 'wouter';

// Centralized route mapping - maps deep link paths to app routes
const DEEP_LINK_ROUTES: Record<string, (params: URLSearchParams) => string> = {
  '/insights/recovery': (params) => {
    const id = params.get('id');
    return id ? `/insights?tab=recovery&id=${id}` : '/insights?tab=recovery';
  },
  '/insights/biomarkers': (params) => {
    const id = params.get('id');
    return id ? `/biomarkers?id=${id}` : '/biomarkers';
  },
  '/biomarkers': (params) => {
    const id = params.get('id');
    return id ? `/biomarkers?id=${id}` : '/biomarkers';
  },
  '/training/workout': (params) => {
    const id = params.get('id');
    return id ? `/training?workout=${id}` : '/training';
  },
  '/supplements': () => '/supplements',
  '/training': () => '/training',
  '/insights': () => '/insights',
};

function routeToPath(url: string) {
  try {
    const parsed = new URL(url, 'http://dummy'); // Use dummy base for relative URLs
    const basePath = parsed.pathname;
    
    // Find matching route handler
    const handler = DEEP_LINK_ROUTES[basePath];
    if (handler) {
      const targetRoute = handler(parsed.searchParams);
      window.location.hash = `#${targetRoute}`;
    } else {
      // Fallback: just use the path as-is
      window.location.hash = `#${basePath}${parsed.search}`;
    }
  } catch (error) {
    console.error('[DeepLink] Failed to route:', url, error);
  }
}

// This will be called when notifications are clicked
export function handleDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    
    // Handle healthpilot:// custom scheme
    if (parsed.protocol === 'healthpilot:') {
      // For custom schemes like healthpilot://insights/recovery?id=123
      // URL parser treats 'insights' as hostname, '/recovery' as pathname
      // Combine them to get full path: /insights/recovery
      const fullPath = `/${parsed.hostname}${parsed.pathname}${parsed.search}`;
      routeToPath(fullPath);
      return;
    }

    // Handle universal links (links.healthpilot.pro)
    if (parsed.hostname === 'links.healthpilot.pro') {
      const fullPath = `${parsed.pathname}${parsed.search}`;
      routeToPath(fullPath);
      return;
    }

    console.warn('[DeepLink] Unknown URL scheme:', url);
  } catch (error) {
    console.error('[DeepLink] Failed to parse URL:', url, error);
  }
}

// Hook for deep link routes (uses same mapping)
export function useDeepLinkRoutes() {
  const [, setLocation] = useLocation();

  // Return handlers that use the central mapping
  const routes: Record<string, (params: URLSearchParams) => void> = {};
  
  for (const [path, handler] of Object.entries(DEEP_LINK_ROUTES)) {
    routes[path] = (params) => {
      const targetRoute = handler(params);
      setLocation(targetRoute);
    };
  }

  return routes;
}
