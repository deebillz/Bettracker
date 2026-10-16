import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Sign-in uses an httpOnly session cookie, which the browser sends automatically
// with same-origin requests, so no tokens are handled in JavaScript.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message = res.statusText || "Request failed";
  try {
    const body = await res.json();
    if (body?.message) message = body.message;
  } catch {
    // not JSON
  }
  return new ApiError(res.status, message);
}

/** Sends a JSON request and throws an ApiError with the server's message on failure. */
export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: data !== undefined ? { "Content-Type": "application/json" } : {},
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) throw await errorFrom(res);
  return res;
}

const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const res = await fetch(queryKey.join("/"), { credentials: "same-origin" });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      // Reload when you switch back to the app (or come back online), so bets
      // logged on another device show up without a manual refresh.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 10_000,
      retry: false,
    },
    mutations: { retry: false },
  },
});
