import { signOut } from "next-auth/react";
import { toast } from "sonner";

/**
 * Fetch wrapper that handles auth errors consistently.
 *
 * - 401 → signs the user out and redirects to login
 * - 403 → shows an "access denied" toast
 * - 429 → shows a "too many requests" toast
 *
 * Returns the Response for successful requests or auth-failed responses
 * (so callers can still check response.ok).
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    toast.error("Session expired. Please sign in again.");
    signOut({ callbackUrl: "/login" });
    return response;
  }

  if (response.status === 403) {
    toast.error("You don't have permission to access this resource");
    return response;
  }

  if (response.status === 429) {
    toast.error("Too many requests. Please slow down.");
    return response;
  }

  return response;
}
