import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { isNativePlatform } from "@/mobile/MobileBootstrap";
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {};
  
  // For mobile, include the session token in Authorization header
  if (isNativePlatform()) {
    try {
      const token = await SecureStorage.get('sessionToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      // Token not found or SecureStorage error, continue without auth header
      console.log('[Auth] No session token found');
    }
  }
  
  return headers;
}

// Get the API base URL - handles mobile vs web
export function getApiBaseUrl(): string {
  if (isNativePlatform()) {
    // On mobile, use the Capacitor config hostname with https
    return 'https://0d420476-b7bb-4cc4-9f5a-da35f5e473e4-00-1n1tyyvrb5uvz.pike.replit.dev';
  } else {
    // On web, use window.location.origin
    return window.location.origin;
  }
}

// Get the WebSocket base URL - handles mobile vs web
export function getWebSocketBaseUrl(): string {
  if (isNativePlatform()) {
    // On mobile, use the Capacitor config hostname
    return '0d420476-b7bb-4cc4-9f5a-da35f5e473e4-00-1n1tyyvrb5uvz.pike.replit.dev';
  } else {
    // On web, use window.location.host
    return window.location.host;
  }
}

// Get the WebSocket protocol - handles mobile vs web
export function getWebSocketProtocol(): string {
  if (isNativePlatform()) {
    // On mobile, always use wss (secure WebSocket)
    return 'wss:';
  } else {
    // On web, match the current protocol
    return window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  }
}

// Overload signatures for apiRequest
export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  body?: any,
): Promise<Response>;
export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<Response>;

// Implementation
export async function apiRequest(
  methodOrUrl: string,
  urlOrOptions?: string | RequestInit,
  body?: any,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  let url: string;
  let options: RequestInit;

  // Determine which signature was used
  if (typeof urlOrOptions === 'string') {
    // Called as apiRequest(method, url, body)
    const method = methodOrUrl;
    url = urlOrOptions;
    options = {
      method,
      headers: {
        ...authHeaders,
      },
    };
    
    if (body !== undefined) {
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify(body);
    }
  } else {
    // Called as apiRequest(url, options)
    url = methodOrUrl;
    options = urlOrOptions || {};
    options.headers = {
      ...authHeaders,
      ...(options.headers || {}),
    };
  }

  // Construct full URL for mobile
  const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`;

  const res = await fetch(fullUrl, {
    ...options,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();
    const relativePath = queryKey.join("/") as string;
    
    // Construct full URL for mobile
    const fullUrl = relativePath.startsWith('http') ? relativePath : `${getApiBaseUrl()}${relativePath}`;
    
    const res = await fetch(fullUrl, {
      headers: authHeaders,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
      retry: 1, // Allow one retry instead of no retries
    },
    mutations: {
      retry: false,
    },
  },
});
