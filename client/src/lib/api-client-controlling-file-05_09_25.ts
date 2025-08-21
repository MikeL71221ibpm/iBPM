import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * API Client for HRSN + BH Analytics Application
 * Last updated: May 9, 2025 - 7:35 PM
 * 
 * This module provides standardized API request functionality and React Query client configuration.
 * It handles authentication, error handling, and provides consistent API access throughout the application.
 */

/**
 * Helper function to throw an error if the response is not OK
 * @param res Response object from fetch
 * @throws Error with status code and text if response is not OK
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Make a standardized API request
 * @param method HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param url API endpoint URL
 * @param data Optional data to include in request body
 * @returns Promise resolving to Response object
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Include credentials for session cookies
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Behavior options for handling 401 Unauthorized responses
 */
type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Create a query function with specified unauthorized behavior
 * @param options Configuration options
 * @returns Query function for use with React Query
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include", // Include credentials for session cookies
    });

    // Handle 401 Unauthorized based on specified behavior
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Centralized query client for use with React Query
 * Configured with sensible defaults for HRSN Analytics application
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // Default to throwing on 401
      refetchInterval: false, // Disable automatic refetching by default
      refetchOnWindowFocus: false, // Disable refetch on window focus
      staleTime: Infinity, // Data never becomes stale automatically
      retry: false, // Don't retry failed queries
    },
    mutations: {
      retry: false, // Don't retry failed mutations
    },
  },
});

/**
 * Utility function to make a GET request and parse JSON response
 * @param url API endpoint URL
 * @returns Promise resolving to parsed response data
 */
export async function apiGet<T>(url: string): Promise<T> {
  const res = await apiRequest('GET', url);
  return await res.json() as T;
}

/**
 * Utility function to make a POST request and parse JSON response
 * @param url API endpoint URL
 * @param data Data to include in request body
 * @returns Promise resolving to parsed response data
 */
export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiRequest('POST', url, data);
  return await res.json() as T;
}

/**
 * Utility function to make a PUT request and parse JSON response
 * @param url API endpoint URL
 * @param data Data to include in request body
 * @returns Promise resolving to parsed response data
 */
export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiRequest('PUT', url, data);
  return await res.json() as T;
}

/**
 * Utility function to make a DELETE request
 * @param url API endpoint URL
 * @returns Promise resolving to boolean indicating success
 */
export async function apiDelete(url: string): Promise<boolean> {
  await apiRequest('DELETE', url);
  return true;
}