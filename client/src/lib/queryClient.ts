import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { isNativePlatform } from "@/mobile/MobileBootstrap";
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
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

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers: {
      ...authHeaders,
      ...(options?.headers || {}),
    },
    body: options?.body,
    credentials: "include",
    signal: options?.signal,
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
    
    const res = await fetch(queryKey.join("/") as string, {
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
